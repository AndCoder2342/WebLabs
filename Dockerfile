FROM golang:1.27.2 AS builder

WORKDIR /src
COPY go.mod ./
COPY *.go ./

RUN CGO_ENABLED=0 go build -o /weblab .

FROM scratch

WORKDIR /app

COPY --from=builder /weblab /app/weblab
COPY index.html index.js style.css /app/

EXPOSE 8080

ENTRYPOINT ["/app/weblab"]
