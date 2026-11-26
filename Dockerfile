FROM golang:1.27.2 AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
COPY archive ./archive

RUN CGO_ENABLED=0 go build -o /weblab .

FROM scratch

WORKDIR /app

COPY --from=builder /weblab /app/weblab
COPY web /app/web

EXPOSE 8080

ENTRYPOINT ["/app/weblab"]
