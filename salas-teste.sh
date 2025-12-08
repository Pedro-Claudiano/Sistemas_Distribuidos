#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzMwMzIyYS03ODZlLTRmMjktODQ4OC03Mzc3N2MzYTAyODciLCJuYW1lIjoiQWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjUyMzA5OTAsImV4cCI6MTc2NTIzNDU5MH0.Ks8vYqhEqJXqLXqvPQxqJqxqJqxqJqxqJqxqJqxqJqw"

curl -X POST https://localhost/api/salas -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"name":"Sala 101","location":"Prédio ADM"}' -k
curl -X POST https://localhost/api/salas -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"name":"Sala 102","location":"Prédio ADM"}' -k
curl -X POST https://localhost/api/salas -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"name":"Laboratório 1","location":"Prédio de Eletrônica"}' -k
curl -X POST https://localhost/api/salas -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"name":"Auditório","location":"Prédio Principal"}' -k
