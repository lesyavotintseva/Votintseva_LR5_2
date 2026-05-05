
// Для отображения предсказаний в этом приложении есть:
// 1. Видео, показывающее поток с веб-камеры пользователя
// 2. Canvas (холст), который появляется поверх видео и отображает предсказания
// При загрузке страницы пользователю предлагается дать разрешение на использование веб-камеры.
// После этого модель инициализируется и начинает делать предсказания.
// При первом предсказании выполняется этап инициализации в функции detectFrame(),
// чтобы подготовить canvas, на котором отображаются предсказания. 

// Словарь (объект), хранящий соответствие: класс объекта → назначенный цвет рамки.
// Позволяет сохранять один и тот же цвет для одного класса между кадрами.
var bounding_box_colors = {};

// Порог уверенности по умолчанию (60%). Предсказания ниже этого значения игнорируются.
var user_confidence = 0.6;

// Список доступных цветов для рамок объектов в формате HEX.
// Каждому новому классу объектов случайно назначается цвет из этого списка. 
var color_choices = [
  "#C7FC00",
  "#FF00FF",
  "#8622FF",
  "#FE0056",
  "#00FFCE",
  "#FF8000",
  "#00B7EB",
  "#FFFF00",
  "#0E7AFE",
  "#FFABAB",
  "#0000FF",
  "#CCCCCC",
];

// Флаг, указывающий, была ли произведена первичная настройка холста.
// Первичная настройка выполняется только один раз — при получении первого предсказания.
var canvas_painted = false;
// Получение элемента <canvas> из DOM по его ID для дальнейшей отрисовки рамок.
var canvas = document.getElementById("video_canvas");
// Получение 2D-контекста рисования холста — объект для управления всей графикой.
var ctx = canvas.getContext("2d");

const inferEngine = new inferencejs.InferenceEngine();
var modelWorkerId = null;

// БЛОК ОБНАРУЖЕНИЯ ОБЪЕКТОВ НА КАДРЕ (ГЛАВНЫЙ ЦИКЛ)
// Функция detectFrame() запускается рекурсивно через requestAnimationFrame,
// обрабатывая каждый кадр видеопотока и передавая его модели.
function detectFrame() {
  // При первом запуске инициализируется canvas
  // При каждом запуске выполняется логический вывод (inference), используя кадр видео
  // Для каждого видеокадра отрисовываются ограничивающие рамки на canvas
  if (!modelWorkerId) return requestAnimationFrame(detectFrame);

  inferEngine.infer(modelWorkerId, new inferencejs.CVImage(video)).then(function(predictions) {
    // Блок первичной настройки холста — выполняется только один раз.
    if (!canvas_painted) {
      var video_start = document.getElementById("video1");

      canvas.top = video_start.top;
      canvas.left = video_start.left;
      canvas.style.top = video_start.top + "px";
      canvas.style.left = video_start.left + "px";
      canvas.style.position = "absolute";
      video_start.style.display = "block";
      canvas.style.display = "absolute";
      canvas_painted = true;

      var loading = document.getElementById("loading");
      loading.style.display = "none";
    }
    requestAnimationFrame(detectFrame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (video) {
      drawBoundingBoxes(predictions, ctx)
    }
  });
}

// БЛОК ОТРИСОВКИ ОГРАНИЧИВАЮЩИХ РАМОК (BOUNDING BOXES)
// Функция drawBoundingBoxes() обрабатывает массив предсказаний и
// отрисовывает рамки с подписями поверх видеопотока на холсте.
// Если нужно обрабатывать предсказания (например, вести счёт или
// записывать результаты) — расширяйте логику именно в этой функции.
function drawBoundingBoxes(predictions, ctx) {
// Итерация по всем предсказаниям текущего кадра.
for (var i = 0; i < predictions.length; i++) {
  // Считываем уровень уверенности модели в данном предсказании (0.0 – 1.0).
  var confidence = predictions[i].confidence;

  // Выводим текущий порог уверенности в консоль браузера (для отладки).
  console.log(user_confidence)

  // Если уровень уверенности ниже порога, установленного пользователем,
  // пропускаем это предсказание и переходим к следующему.
  if (confidence < user_confidence) {
    continue
  }

  // Блок назначения цвета рамки.
  // Если цвет для данного класса объекта уже был назначен ранее — используем его.
  if (predictions[i].class in bounding_box_colors) {
    ctx.strokeStyle = bounding_box_colors[predictions[i].class];
  } else {
    // Иначе случайно выбираем цвет из списка доступных цветов.
    var color =
      color_choices[Math.floor(Math.random() * color_choices.length)];
    ctx.strokeStyle = color;

    // Удаляем использованный цвет из списка, чтобы разные классы получали разные цвета.
    // splice(index, 1) — удаляет 1 элемент по указанному индексу.
    color_choices.splice(color_choices.indexOf(color), 1);

    // Сохраняем назначенный цвет в словаре для данного класса объекта.
    bounding_box_colors[predictions[i].class] = color;
  }

  // Блок вычисления координат и размеров рамки.
  var prediction = predictions[i];

  // Координаты центра рамки (bbox.x, bbox.y) преобразуем в координаты верхнего левого угла,
  // вычитая половину ширины и высоты соответственно.
  var x = prediction.bbox.x - prediction.bbox.width / 2;
  var y = prediction.bbox.y - prediction.bbox.height / 2;
  var width = prediction.bbox.width;
  var height = prediction.bbox.height;

  // Добавляем прямоугольник в путь рисования холста.
  ctx.rect(x, y, width, height);

  // Устанавливаем прозрачную заливку, чтобы видео просвечивало сквозь рамку.
  ctx.fillStyle = "rgba(0, 0, 0, 0)";
  ctx.fill();

  // Блок отрисовки рамки и текстовой подписи.
  // Устанавливаем цвет обводки рамки равным цвету заливки текста.
  ctx.fillStyle = ctx.strokeStyle;

  // Толщина линии рамки — 4 пикселя.
  ctx.lineWidth = "4";

  // Отрисовываем прямоугольную рамку по вычисленным координатам.
  ctx.strokeRect(x, y, width, height);

  // Настройка шрифта подписи.
  ctx.font = "25px Arial";

  // Отображаем название класса объекта и процент уверенности над рамкой.
  // Math.round(confidence * 100) преобразует долю (0.87) в процент (87).
  ctx.fillText(prediction.class + " " + Math.round(confidence * 100) + "%", x, y - 10);
}
}

// БЛОК ИНИЦИАЛИЗАЦИИ ВЕБ-КАМЕРЫ И ЗАПУСКА МОДЕЛИ
// Функция webcamInference() запрашивает доступ к веб-камере,
// создаёт видеоэлемент, настраивает размеры холста и запускает
// модель Roboflow через InferenceEngine.
function webcamInference() {
// Показываем индикатор загрузки на время инициализации камеры и модели.
var loading = document.getElementById("loading");
loading.style.display = "block";

// Запрашиваем доступ к медиаустройствам пользователя.
// { video: { facingMode: "environment" } } — предпочитаем основную (заднюю) камеру.
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: "environment" } })
  .then(function(stream) {
    // Создаём HTML-элемент <video> динамически и добавляем его в DOM.
video = document.createElement("video");

// Привязываем полученный поток веб-камеры к видеоэлементу.
video.srcObject = stream;
video.id = "video1";

// Скрываем видеоэлемент до тех пор, пока поток полностью не загрузится.
video.style.display = "none";

// Атрибут playsinline — предотвращает переход в полноэкранный режим на iOS.
video.setAttribute("playsinline", "");

// Вставляем видеоэлемент в DOM сразу после элемента canvas.
document.getElementById("video_canvas").after(video);

// Начинаем воспроизведение видео после загрузки метаданных потока (размеры кадра и т.д.).
video.onloadedmetadata = function() {
  video.play();
}

// Блок настройки размеров видео и холста при начале воспроизведения.
video.onplay = function() {
  // Считываем реальные размеры видеопотока с веб-камеры.
  height = video.videoHeight;
  width = video.videoWidth;

  // Устанавливаем реальные пиксельные размеры видеоэлемента.
  video.width = width;
  video.height = height;

  // Отображаемые CSS-размеры: фиксируем 640×480 пикселей для единообразия.
  video.style.width = 640 + "px";
  video.style.height = 480 + "px";

  // Устанавливаем отображаемые CSS-размеры холста, совпадающие с видео.
  canvas.style.width = 640 + "px";
  canvas.style.height = 480 + "px";

  // Устанавливаем внутренние (буферные) размеры холста равными размерам видеопотока.
  canvas.width = width;
  canvas.height = height;

  // Делаем холст видимым после настройки размеров.
  document.getElementById("video_canvas").style.display = "block";
};

// Применяем масштаб 1:1 к контексту холста (без дополнительного масштабирования).
ctx.scale(1, 1);

// Блок загрузки и запуска модели Roboflow.
// startWorker() загружает модель по имени и версии, используя публичный ключ.
// scoreThreshold — дополнительный порог уверенности на стороне движка.
// Возвращает Promise с ID рабочего потока (modelWorkerId).
inferEngine.startWorker(MODEL_NAME, MODEL_VERSION, publishable_key, [{ scoreThreshold: CONFIDENCE_THRESHOLD }])
  .then((id) => {
    // Сохраняем ID рабочего потока для использования в detectFrame().
    modelWorkerId = id;

    // Запускаем главный цикл обработки кадров.
    detectFrame();
  });
})
// Обработка ошибок: например, если пользователь запретил доступ к камере.
.catch(function(err) {
console.log(err);
});
}

// БЛОК УПРАВЛЕНИЯ ПОРОГОМ УВЕРЕННОСТИ (ПОЛЬЗОВАТЕЛЬСКИЙ ВВОД)
// Обновляет переменную user_confidence при изменении ползунка.

// Функция считывает значение ползунка (1–100) и преобразует его
// в долю (0.01–1.0), записывая результат в глобальную переменную user_confidence.
function changeConfidence () {
user_confidence = document.getElementById("confidence").value / 100;
}

// Подписываемся на событие "input" ползунка — функция вызывается при каждом движении ползунка.
document.getElementById("confidence").addEventListener("input", changeConfidence);

// БЛОК ЗАПУСКА ПРИЛОЖЕНИЯ
// Немедленный запуск основной функции при загрузке скрипта.
// Вызываем функцию инициализации веб-камеры и модели при старте страницы.
webcamInference();