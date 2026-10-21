package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net"
	"net/http"
	"net/http/fcgi"
	"slices"
	"strconv"
	"strings"
	"time"
)

type Result struct {
	X               float64 `json:"x"`
	Y               float64 `json:"y"`
	R               float64 `json:"r"`
	Hit             bool    `json:"hit"`
	Timestamp       int64   `json:"timestamp"`
	ExecutionTimeMS float64 `json:"execution_time_ms"`
}

func (r *Result) calculateHit() {
	inTriangle := r.X <= 0 && r.Y <= 0 && r.X+r.Y >= -r.R
	inRectangle := r.X >= 0 && r.X <= r.R/2 && r.Y <= 0 && r.Y >= -r.R
	inCircle := r.X <= 0 && r.Y >= 0 && r.X*r.X+r.Y*r.Y <= (r.R/2)*(r.R/2)
	r.Hit = inTriangle || inRectangle || inCircle
	//return inTriangle || inRectangle || inCircle
}

func (r Result) validate() error {
	if math.IsNaN(r.X) || math.IsNaN(r.Y) || math.IsNaN(r.R) || math.IsInf(r.X, 0) || math.IsInf(r.Y, 0) || math.IsInf(r.R, 0) {
		return errors.New("поля содержат NaN или бесконечности")
	} else if !slices.Contains([]float64{-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2}, r.X) {
		return errors.New("недопустимое значение X")
	} else if r.Y <= -5 || r.Y >= 3 {
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
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(resultJSON); err != nil {
		log.Println("ошибка отправки ответа:", err)
		return
	}

}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/check", checkHandler)

	listener, err := net.Listen("tcp", ":9000")
	if err != nil {
		log.Fatal(err)
	}
	defer listener.Close()

	log.Println("FastCGI-сервер слушает :9000")
	if err := fcgi.Serve(listener, mux); err != nil {
		log.Fatal(err)
	}
}
