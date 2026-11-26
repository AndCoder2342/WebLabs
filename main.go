package main

import (
	"context"
	"crypto/rand"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log"
	"math"
	"net/http"
	"os"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Result struct {
	X               float64 `json:"x"`
	Y               float64 `json:"y"`
	R               float64 `json:"r"`
	Hit             bool    `json:"hit"`
	Timestamp       int64   `json:"timestamp"`
	ExecutionTimeMS float64 `json:"execution_time_ms"`
}

type User struct {
	ID       int64
	Username string
	IsAdmin  bool
}

type PageData struct {
	User  User
	Error string
}

//go:embed archive/dots.sql
var resultsMigration string

var database *pgxpool.Pool
var templates *template.Template

const sessionCookieName = "session_id"

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]{3,32}$`)

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

func renderTemplate(w http.ResponseWriter, name string, data PageData) {
	if err := templates.ExecuteTemplate(w, name, data); err != nil {
		log.Println("ошибка формирования страницы:", err)
		http.Error(w, "не удалось сформировать страницу", http.StatusInternalServerError)
	}
}

func createSession(w http.ResponseWriter, userID int64) error {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return err
	}

	token := base64.RawURLEncoding.EncodeToString(tokenBytes)
	expires := time.Now().Add(24 * time.Hour)

	_, err := database.Exec(context.Background(), `
		INSERT INTO sessions (token, user_id, expires_at)
		VALUES ($1, $2, $3)
	`, token, userID, expires.UnixMilli())
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expires,
		MaxAge:   int((24 * time.Hour).Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func currentUser(r *http.Request) (User, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		return User{}, err
	}

	var user User
	err = database.QueryRow(r.Context(), `
		SELECT users.id, users.username, users.is_admin
		FROM sessions
		JOIN users ON users.id = sessions.user_id
		WHERE sessions.token = $1 AND sessions.expires_at > $2
	`, cookie.Value, time.Now().UnixMilli()).Scan(
		&user.ID,
		&user.Username,
		&user.IsAdmin,
	)
	return user, err
}

func requireUser(w http.ResponseWriter, r *http.Request) (User, bool) {
	user, err := currentUser(r)
	if err == nil {
		return user, true
	}

	if !errors.Is(err, http.ErrNoCookie) && !errors.Is(err, pgx.ErrNoRows) {
		log.Println("ошибка проверки сессии:", err)
		http.Error(w, "не удалось проверить сессию", http.StatusInternalServerError)
		return User{}, false
	}

	if strings.HasPrefix(r.URL.Path, "/api/") {
		http.Error(w, "требуется авторизация", http.StatusUnauthorized)
	} else {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
	}
	return User{}, false
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		if _, err := currentUser(r); err == nil {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}
		renderTemplate(w, "login.html", PageData{})
		return
	}

	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseForm(); err != nil {
		renderTemplate(w, "login.html", PageData{Error: "Не удалось прочитать форму"})
		return
	}

	username := strings.TrimSpace(r.PostFormValue("username"))
	password := r.PostFormValue("password")

	var user User
	var passwordHash string
	err := database.QueryRow(r.Context(), `
		SELECT id, username, password_hash, is_admin
		FROM users
		WHERE username = $1
	`, username).Scan(&user.ID, &user.Username, &passwordHash, &user.IsAdmin)
	if errors.Is(err, pgx.ErrNoRows) {
		renderTemplate(w, "login.html", PageData{Error: "Неверный логин или пароль"})
		return
	}
	if err != nil {
		log.Println("ошибка входа:", err)
		http.Error(w, "не удалось выполнить вход", http.StatusInternalServerError)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)) != nil {
		renderTemplate(w, "login.html", PageData{Error: "Неверный логин или пароль"})
		return
	}

	if err := createSession(w, user.ID); err != nil {
		log.Println("ошибка создания сессии:", err)
		http.Error(w, "не удалось создать сессию", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		if _, err := currentUser(r); err == nil {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}
		renderTemplate(w, "register.html", PageData{})
		return
	}

	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseForm(); err != nil {
		renderTemplate(w, "register.html", PageData{Error: "Не удалось прочитать форму"})
		return
	}

	username := strings.TrimSpace(r.PostFormValue("username"))
	password := r.PostFormValue("password")
	passwordRepeat := r.PostFormValue("password_repeat")

	if !usernamePattern.MatchString(username) {
		renderTemplate(w, "register.html", PageData{Error: "Логин должен содержать от 3 до 32 латинских букв, цифр или _"})
		return
	}
	if len(password) < 6 || len(password) > 72 {
		renderTemplate(w, "register.html", PageData{Error: "Пароль должен содержать от 6 до 72 символов"})
		return
	}
	if password != passwordRepeat {
		renderTemplate(w, "register.html", PageData{Error: "Пароли не совпадают"})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "не удалось обработать пароль", http.StatusInternalServerError)
		return
	}

	var userID int64
	err = database.QueryRow(r.Context(), `
		INSERT INTO users (username, password_hash)
		VALUES ($1, $2)
		RETURNING id
	`, username, string(passwordHash)).Scan(&userID)
	if err != nil {
		var pgError *pgconn.PgError
		if errors.As(err, &pgError) && pgError.Code == "23505" {
			renderTemplate(w, "register.html", PageData{Error: "Пользователь с таким логином уже существует"})
			return
		}
		log.Println("ошибка регистрации:", err)
		http.Error(w, "не удалось зарегистрировать пользователя", http.StatusInternalServerError)
		return
	}

	if err := createSession(w, userID); err != nil {
		log.Println("ошибка создания сессии:", err)
		http.Error(w, "не удалось создать сессию", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		if _, err := database.Exec(r.Context(), `DELETE FROM sessions WHERE token = $1`, cookie.Value); err != nil {
			log.Println("ошибка удаления сессии:", err)
		}
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(1, 0),
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

func ensureAdmin(ctx context.Context) error {
	username := strings.TrimSpace(os.Getenv("ADMIN_USERNAME"))
	password := os.Getenv("ADMIN_PASSWORD")
	if username == "" || password == "" {
		return nil
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = database.Exec(ctx, `
		INSERT INTO users (username, password_hash, is_admin)
		VALUES ($1, $2, TRUE)
		ON CONFLICT (username) DO UPDATE
		SET password_hash = EXCLUDED.password_hash, is_admin = TRUE
	`, username, string(passwordHash))
	return err
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
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
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
		INSERT INTO results (user_id, x, y, r, hit, timestamp, execution_time_ms)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, user.ID, result.X, result.Y, result.R, result.Hit, result.Timestamp, result.ExecutionTimeMS)
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
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	rows, err := database.Query(r.Context(), `
		SELECT x, y, r, hit, timestamp, execution_time_ms
		FROM results
		WHERE user_id = $1
		ORDER BY id
	`, user.ID)
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
	if err := ensureAdmin(context.Background()); err != nil {
		log.Fatal(err)
	}

	templates, err = template.ParseGlob("web/templates/*.html")
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		user, ok := requireUser(w, r)
		if !ok {
			return
		}
		renderTemplate(w, "index.html", PageData{User: user})
	})
	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/register", registerHandler)
	mux.HandleFunc("/logout", logoutHandler)
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
