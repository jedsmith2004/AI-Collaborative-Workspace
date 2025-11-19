from services.db import Base, engine
from models import note, user, workspace

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("neon db created")