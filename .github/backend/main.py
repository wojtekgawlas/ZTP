from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "System rezerwacji restauracji działa!"}

@app.get("/rezerwacje")
def get_rezerwacje():
    # Tu później dodasz logikę pobierania danych z bazy
    return [{"id": 1, "stolik": 5, "godzina": "18:00"}]
