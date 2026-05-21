# =========================================
# FRONTEND BUILD
# =========================================
FROM node:20 AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build


# =========================================
# APP + POSTGRES
# =========================================
FROM python:3.11-slim

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

# Dependências do sistema
RUN apt-get update && apt-get install -y \
    nginx \
    postgresql \
    postgresql-contrib \
    curl \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Instala uv
RUN pip install uv

# Copia projeto
COPY . .

# =========================================
# PYTHON DEPENDENCIES
# =========================================
RUN if [ -f pyproject.toml ]; then \
        uv pip install --system . ; \
    elif [ -f requirements.txt ]; then \
        pip install -r requirements.txt ; \
    fi

# =========================================
# FRONTEND
# =========================================
COPY --from=frontend /app/dist /var/www/html

# =========================================
# POSTGRES CONFIG
# =========================================
ENV POSTGRES_DB=sinarca_db
ENV POSTGRES_USER=sinarca
ENV POSTGRES_PASSWORD=sinarca123

RUN service postgresql start && \
    su postgres -c "psql --command \"CREATE USER $POSTGRES_USER WITH SUPERUSER PASSWORD '$POSTGRES_PASSWORD';\"" && \
    su postgres -c "createdb -O $POSTGRES_USER $POSTGRES_DB"

# =========================================
# DATABASE URL
# =========================================
ENV DATABASE_URL=postgresql://sinarca:sinarca123@localhost:5432/sinarca_db

# =========================================
# START SCRIPT
# =========================================
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
service postgresql start\n\
\n\
uvicorn backend.main:app --host 0.0.0.0 --port 5680 &\n\
\n\
tail -f /dev/null\n\
' > /start.sh && chmod +x /start.sh

EXPOSE 80
EXPOSE 5680

CMD ["/start.sh"]
