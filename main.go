package main

import (
	"errors"
	"fmt"
	"math"
	"slices"
)

type Result struct {
	X               float64 `json:"x"`
	Y               float64 `json:"y"`
	R               float64 `json:"r"`
	Hit             bool    `json:"hit"`
	Timestamp       int64   `json:"timestamp"`
	ExecutionTimeMS float64 `json:"execution_time_ms"`
}

func (r Result) isPointInside() bool {
	inTriangle := r.X <= 0 && r.Y <= 0 && r.X+r.Y >= -r.R
	inRectangle := r.X >= 0 && r.X <= r.R/2 && r.Y <= 0 && r.Y >= -r.R
	inCircle := r.X <= 0 && r.Y >= 0 && r.X*r.X+r.Y*r.Y <= (r.R/2)*(r.R/2)
	return inTriangle || inRectangle || inCircle
}

func (r Result) Validate() error {
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

func main() {
	p := Result{X: -1, Y: -1, R: 2}
	fmt.Println(p.Validate())
	fmt.Println(p.isPointInside())
}
