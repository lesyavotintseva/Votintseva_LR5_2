from flask import Flask, render_template # Импортируем класс Flask и функцию render_template из модуля flask

app = Flask(__name__) # Создаем экземпляр класса Flask, который представляет веб-приложение
# Декоратор @app.route('/') связывает функцию hello_world с корневым URL-адресом приложения
@app.route('/')
def hello_world():
    return render_template("index.html")
# Проверяем, что скрипт запущен напрямую (а не импортирован как модуль в другой файл)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)