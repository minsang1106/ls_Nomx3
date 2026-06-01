from backend.app import app, seed_if_empty


if __name__ == "__main__":
    import os

    seed_if_empty()
    app.run(
        host=os.getenv("APP_HOST", "127.0.0.1"),
        port=int(os.getenv("APP_PORT", "5000")),
        debug=True,
    )
