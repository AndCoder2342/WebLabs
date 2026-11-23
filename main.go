package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log"
	"math"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Result struct {
	X               float64 `json:"x"`
	Y               float64 `json:"y"`
	R               float64 `json:"r"`
	Hit             bool    `json:"hit"`
	Timestamp       int64   `json:"timestamp"`
	ExecutionTimeMS float64 `json:"execution_time_ms"`
}

//go:embed archive/dots.sql
var resultsMigration string

var database *pgxpool.Pool

func (r *Result) calculateHit() {
	inSquare := r.X >= 0 && r.X <= r.R && r.Y >= 0 && r.Y <= r.R
	inTriangle := r.X >= -r.R/2 && r.X <= 0 && r.Y >= 0 && r.Y <= 2*r.X+r.R
	inCircle := r.X >= 0 && r.Y <= 0 && r.X*r.X+r.Y*r.Y <= (r.R/2)*(r.R/2)
	r.Hit = inSquare || inTriangle || inCircle
}

func (r Result) validate() error {
	if math.IsNaN(r.X) || math.IsNaN(r.Y) || math.IsNaN(r.R) || math.IsInf(r.X, 0) || math.IsInf(r.Y, 0) || math.IsInf(r.R, 0) {
		return errors.New("поля содержат NaN или бесконечности")
	} else if r.X < -3 || r.X > 3 {
		return errors.New("недопустимое значение X")
	} else if !slices.Contains([]float64{-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2}, r.Y) {
		return errors.New("недопустимое значение Y")
	} else if !slices.Contains([]float64{1, 1.5, 2, 2.5, 3}, r.R) {
		return errors.New("недопустимое значение R")
	}
	return nil
}

func readNumber(r *http.Request, name string) (float64, error) {
	err := r.ParseForm()
	if err != nil {
		return 0, err
	}
	values := r.PostForm[name]
	if len(values) != 1 {
		return 0, fmt.Errorf("поле %s должно быть передано ровно один раз", name)
	}
	v := strings.TrimSpace(values[0])
	v = strings.ReplaceAll(v, ",", ".")
	num, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return 0, err
	}
	return num, nil
}
func checkHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	x, err := readNumber(r, "x")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	y, err := readNumber(r, "y")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	rad, err := readNumber(r, "r")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	result := Result{X: x, Y: y, R: rad}

	if err := result.validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	result.calculateHit()
	result.Timestamp = start.UnixMilli()
	result.ExecutionTimeMS = time.Since(start).Seconds() * 1000
	resultJSON, err := json.Marshal(result)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	_, err = database.Exec(r.Context(), `
		INSERT INTO results (x, y, r, hit, timestamp, execution_time_ms)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, result.X, result.Y, result.R, result.Hit, result.Timestamp, result.ExecutionTimeMS)
	if err != nil {
		log.Println("ошибка сохранения результата:", err)
		http.Error(w, "не удалось сохранить результат", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(resultJSON); err != nil {
		log.Println("ошибка отправки ответа:", err)
		return
	}

}

func resultsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	rows, err := database.Query(r.Context(), `
		SELECT x, y, r, hit, timestamp, execution_time_ms
		FROM results
		ORDER BY id
	`)
	if err != nil {
		log.Println("ошибка чтения истории:", err)
		http.Error(w, "не удалось загрузить историю", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	results := make([]Result, 0)
	for rows.Next() {
		var result Result
		if err := rows.Scan(
			&result.X,
			&result.Y,
			&result.R,
			&result.Hit,
			&result.Timestamp,
			&result.ExecutionTimeMS,
		); err != nil {
			log.Println("ошибка чтения результата:", err)
			http.Error(w, "не удалось загрузить историю", http.StatusInternalServerError)
			return
		}
		results = append(results, result)
	}
	if err := rows.Err(); err != nil {
		log.Println("ошибка чтения истории:", err)
		http.Error(w, "не удалось загрузить историю", http.StatusInternalServerError)
		return
	}

	resultsJSON, err := json.Marshal(results)
	if err != nil {
		http.Error(w, "не удалось сформировать историю", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(resultsJSON); err != nil {
		log.Println("ошибка отправки ответа:", err)
		return
	}
}

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://weblab:weblab@localhost:5432/weblab?sslmode=disable"
	}

	var err error
	database, err = pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	if err := database.Ping(context.Background()); err != nil {
		log.Fatal(err)
	}
	if _, err := database.Exec(context.Background(), resultsMigration); err != nil {
		log.Fatal(err)
	}

	templates, err := template.ParseFiles("web/templates/index.html")
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		if err := templates.ExecuteTemplate(w, "index.html", nil); err != nil {
			http.Error(w, "не удалось сформировать страницу", http.StatusInternalServerError)
		}
	})
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir("web/static"))))
	mux.HandleFunc("/api/check", checkHandler)
	mux.HandleFunc("/api/results", resultsHandler)

	server := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Println("HTTP-сервер слушает :8080")
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

//docker compose up --build -d
