function draw() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;
    const r = Math.min(width, height) / 3;

    ctx.save();
    ctx.fillStyle = 'rgb(0 160 255)';
    ctx.strokeStyle = '#0077bf';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(width / 2 - r, height / 2);
    ctx.lineTo(width / 2 - r / 2, height / 2);
    ctx.arc(width / 2, height / 2, r / 2, Math.PI, Math.PI * 1.5);
    ctx.lineTo(width / 2, height / 2);
    ctx.lineTo(width / 2 + r / 2, height / 2);
    ctx.lineTo(width / 2 + r / 2, height / 2 + r);
    ctx.lineTo(width / 2, height / 2 + r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 6;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(50, height / 2);
    ctx.lineTo(width - 50, height / 2);

    ctx.moveTo(width / 2, 50);
    ctx.lineTo(width / 2, height - 50);

    ctx.moveTo(width / 2, 50);
    ctx.lineTo(width / 2 - 20, 90);

    ctx.moveTo(width / 2, 50);
    ctx.lineTo(width / 2 + 20, 90);

    ctx.moveTo(width - 50, height / 2);
    ctx.lineTo(width - 90, height / 2 - 20);

    ctx.moveTo(width - 50, height / 2);
    ctx.lineTo(width - 90, height / 2 + 20);

    ctx.moveTo(width / 2 - 10, height / 2 - r);
    ctx.lineTo(width / 2 + 10, height / 2 - r);

    ctx.moveTo(width / 2 - 10, height / 2 - r / 2);
    ctx.lineTo(width / 2 + 10, height / 2 - r / 2);

    ctx.moveTo(width / 2 - 10, height / 2 + r / 2);
    ctx.lineTo(width / 2 + 10, height / 2 + r / 2);

    ctx.moveTo(width / 2 - 10, height / 2 + r);
    ctx.lineTo(width / 2 + 10, height / 2 + r);

    ctx.moveTo(width / 2 + r, height / 2 - 10);
    ctx.lineTo(width / 2 + r, height / 2 + 10);

    ctx.moveTo(width / 2 + r / 2, height / 2 - 10);
    ctx.lineTo(width / 2 + r / 2, height / 2 + 10);

    ctx.moveTo(width / 2 - r / 2, height / 2 - 10);
    ctx.lineTo(width / 2 - r / 2, height / 2 + 10);

    ctx.moveTo(width / 2 - r, height / 2 - 10);
    ctx.lineTo(width / 2 - r, height / 2 + 10);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '60px Arial';

    ctx.fillText('R', width / 2 + 30, height / 2 - r);
    ctx.fillText('R/2', width / 2 + 30, height / 2 - r / 2);

    ctx.fillText('-R', width / 2 + 30, height / 2 + r);
    ctx.fillText('-R/2', width / 2 + 30, height / 2 + r / 2);

    ctx.fillText('R/2', width / 2 + r / 2, height / 2 - 30);
    ctx.fillText('R', width / 2 + r, height / 2 - 30);

    ctx.fillText('-R/2', width / 2 - r / 2, height / 2 - 30);
    ctx.fillText('-R', width / 2 - r, height / 2 - 30);

    ctx.fillText('x', width - 70, height / 2 - 40);
    ctx.fillText('y', width / 2 + 40, 90);

    ctx.fillText('x: ', 40, height - 100);
    ctx.fillText('y: ', 40, height - 40);
}

const form = document.getElementById('form');
const y_input = document.getElementById('y_input');
const form_error = document.getElementById('form_error');
const results_body = document.getElementById('results_body');
const r_input = document.getElementById('r_input');

const sort_param = document.getElementById('sort_param');
const sort_option = document.getElementById('sort_option');

const all_points = document.getElementById('show_all_points');
const sort_points_param = document.getElementById('sort_points_param');

const STORAGE_KEY = 'web_lab1_results';
const FORM_STORAGE_KEY = 'web_lab1_form';

let results = loadResults();
let highlighted_result = null;
let canvas_position = null;
let canvas_hover = false;

function loadResults() {
    try {
        const saved_results = localStorage.getItem(STORAGE_KEY);

        if (saved_results === null) {
            return [];
        }
        const parsed_results = JSON.parse(saved_results);

        if (Array.isArray(parsed_results) === false) {
            return [];
        }

        for (const result of parsed_results) {
            result.hit = is_point_inside(
                result.x,
                result.y,
                result.r
            );
        }

        return parsed_results;
    } catch {
        return [];
    }
}

function save_results() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function save_form_state() {
    const x_element = document.querySelector(
        'button[name="x"][aria-pressed="true"]'
    );

    const form_state = {
        x: null,
        y: y_input.value,
        r: r_input.value
    };

    if (x_element !== null) {
        form_state.x = x_element.value;
    }

    localStorage.setItem(
        FORM_STORAGE_KEY,
        JSON.stringify(form_state)
    );
}

function load_form_state() {
    const saved_state =
        localStorage.getItem(FORM_STORAGE_KEY);

    if (saved_state === null) {
        return;
    }

    try {
        const form_state =
            JSON.parse(saved_state);

        y_input.value = form_state.y || '';

        for (const button of x_input) {
            button.setAttribute(
                'aria-pressed',
                String(button.value === form_state.x)
            );
        }

        r_input.value = form_state.r || '';
    } catch {
        localStorage.removeItem(
            FORM_STORAGE_KEY
        );
    }
}

function select_x(event) {
    for (const button of x_input) {
        button.setAttribute(
            'aria-pressed',
            String(button === event.currentTarget)
        );
    }

    save_form_state();
    redraw_canvas();
}

const x_input = document.querySelectorAll(
    'button[name="x"]'
);

for (const button of x_input) {
    button.addEventListener('click', select_x);
}

r_input.addEventListener('change', redraw_canvas);
y_input.addEventListener('input', validate_y);
y_input.addEventListener('input', redraw_canvas);

function validate_y() {
    if (y_input.value !== '' && parse_y(y_input.value) === null) {
        y_input.setCustomValidity('Y должен быть числом больше −5 и меньше 3');
    } else {
        y_input.setCustomValidity('');
    }
}

function parse_y(value) {
    const normalized = value.trim().replace(',', '.');
    const number_pattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

    if (number_pattern.test(normalized) === false) {
        return null;
    }

    const y = Number(normalized);
    if (Number.isFinite(y) === false) {
        return null;
    }

    if (y <= -5 || y >= 3) {
        return null;
    }
    return y;
}

function get_form_values() {
    const x_element = document.querySelector('button[name="x"][aria-pressed="true"]');

    if (x_element === null) {
        throw new Error('Выберите координату X');
    }

    const y = parse_y(y_input.value);

    if (y === null) {
        throw new Error('Y должен быть числом больше −5 и меньше 3');
    }

    if (r_input.value === '') {
        throw new Error('Выберите радиус R');
    }

    return {
        x: Number(x_element.value),
        y: y,
        r: Number(r_input.value)
    };
}

function is_point_inside(x, y, r) {
    const in_triangle = x <= 0 && y <= 0 && x + y >= -r;

    const in_rectangle = x >= 0 && x <= r / 2 && y <= 0 && y >= -r;

    const in_circle = x <= 0 && y >= 0 && x * x + y * y <= (r / 2) ** 2;

    return in_triangle || in_rectangle || in_circle;
}

function redraw_canvas() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw();

    if (all_points.checked) {
        draw_all_points(sort_points_param.value);
    }

    let values = null;

    try {
        values = get_form_values();
    } catch {
        values = null;
    }

    if (values !== null) {
        values.hit = is_point_inside(
            values.x,
            values.y,
            values.r
        );

        drawDots(values);
    }

    if (highlighted_result !== null) {
        drawDots(highlighted_result, 7);
    }

    draw_target();
}

function drawDots(result, radius = 5) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;
    const scale = Math.min(width, height) / 3;

    const point_x = width / 2 + result.x / result.r * scale;
    const point_y = height / 2 - result.y / result.r * scale;

    ctx.save();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(point_x, point_y, radius * Math.min(width, height) / 500, 0, Math.PI * 2);

    if (result.hit === true) {
        ctx.fillStyle = 'green';
    } else {
        ctx.fillStyle = 'red';
    }

    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
}

function canvas_click(event) {
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    const width = canvas.width;
    const height = canvas.height;
    const scale = Math.min(width, height) / 3;

    const canvas_x =
        (event.clientX - rect.left) *
        canvas.width / rect.width;

    const canvas_y =
        (event.clientY - rect.top) *
        canvas.height / rect.height;

    if (r_input.value === '') {
        alert('Сначала выберите радиус R');
        return;
    }

    const r = Number(r_input.value);

    let x = (canvas_x - width / 2) / scale * r;
    let y = (height / 2 - canvas_y) / scale * r;

    x = Number(x.toFixed(2));
    y = Number(y.toFixed(2));

    if (Object.is(x, -0)) {
        x = 0;
    }

    if (Object.is(y, -0)) {
        y = 0;
    }

    alert(
        'Координаты точки:\n' +
        'X = ' + x + '\n' +
        'Y = ' + y
    );
}

function canvas_target(event) {
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();

    canvas_position = {
        x: (event.clientX - rect.left) *
            canvas.width / rect.width,
        y: (event.clientY - rect.top) *
            canvas.height / rect.height
    };

    canvas_hover = true;
    redraw_canvas();
}

function draw_target() {
    if (canvas_position === null) {
        return;
    }

    if (r_input.value === '') {
        return;
    }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const scale = Math.min(width, height) / 3;
    const canvas_x = canvas_position.x;
    const canvas_y = canvas_position.y;
    const r = Number(r_input.value);

    const x = Number(
        ((canvas_x - width / 2) / scale * r).toFixed(2)
    );

    const y = Number(
        ((height / 2 - canvas_y) / scale * r).toFixed(2)
    );

    ctx.save();

    if (canvas_hover) {
        ctx.beginPath();
        ctx.setLineDash([30, 15]);
        ctx.moveTo(0, canvas_y);
        ctx.lineTo(canvas.width, canvas_y);
        ctx.moveTo(canvas_x, 0);
        ctx.lineTo(canvas_x, canvas.height);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.fillStyle = '#000';
    ctx.font = '60px Arial';
    ctx.fillText(String(x), 110, height - 100);
    ctx.fillText(String(y), 110, height - 40);
    ctx.restore();
}

function format_date(timestamp) {
    return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'medium',
    }).format(new Date(timestamp));
}

function create_cell(value) {
    const cell = document.createElement('td');
    cell.textContent = String(value);
    return cell;
}

function compare_results(param, option) {
    return function (first_result, second_result) {
        let difference;

        switch (param) {
            case 'x':
                difference =
                    first_result.x - second_result.x;
                break;

            case 'y':
                difference =
                    first_result.y - second_result.y;
                break;

            case 'r':
                difference =
                    first_result.r - second_result.r;
                break;

            case 'date':
                difference =
                    first_result.timestamp -
                    second_result.timestamp;
                break;

            default:
                return 0;
        }

        if (option === '>') {
            return difference;
        }

        return -difference;
    };
}

function draw_all_points(value) {
    for (const result of results) {
        if (value === 'in' && result.hit !== true) {
            continue;
        }

        if (value === 'out' && result.hit !== false) {
            continue;
        }

        drawDots(result);
    }
}

function change_result_value(event) {
    const input = event.target;
    const result_index = Number(input.dataset.index);
    const param = input.dataset.param;
    const result = results[result_index];
    let new_value;

    if (param === 'y') {
        new_value = parse_y(input.value);
    } else {
        const normalized = input.value.trim().replace(',', '.');
        const controls = param === 'x' ? x_input : r_input.options;
        const number_pattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
        new_value = Number(normalized);

        if (
            number_pattern.test(normalized) === false ||
            Array.from(controls).some(control =>
                control.value !== '' && Number(control.value) === new_value
            ) === false
        ) {
            new_value = null;
        }
    }

    if (new_value === null) {
        if (param === 'y') {
            alert('Y должен быть числом больше −5 и меньше 3');
        } else {
            alert(param.toUpperCase() + ': выберите значение из набора в форме');
        }
        input.value = String(result[param]);
        return;
    }

    result[param] = new_value;
    result.hit = is_point_inside(
        result.x,
        result.y,
        result.r
    );

    save_results();
    render_results();
}

function create_special_cell(value, result_index, param) {
    const table_cell = document.createElement('td');
    const input = document.createElement('input');

    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'result_input';
    input.value = String(value);
    input.dataset.index = String(result_index);
    input.dataset.param = param;
    input.setAttribute('aria-label', 'Изменить ' + param.toUpperCase());
    input.addEventListener('change', change_result_value);

    table_cell.appendChild(input);

    return table_cell;
}

function render_results() {
    results.sort(compare_results(
        sort_param.value,
        sort_option.value
    ));

    highlighted_result = null;
    results_body.replaceChildren();

    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const row = document.createElement('tr');

        row.addEventListener('mouseenter', () => {
            highlighted_result = result;
            redraw_canvas();
        });

        row.addEventListener('mouseleave', () => {
            highlighted_result = null;
            redraw_canvas();
        });

        let result_text;

        if (result.hit === true) {
            result_text = 'Попадание';
            row.className = 'hit';
        } else {
            result_text = 'Промах';
            row.className = 'miss';
        }

        const x_cell = create_special_cell(result.x, i, 'x');
        const y_cell = create_special_cell(result.y, i, 'y');
        const r_cell = create_special_cell(result.r, i, 'r');
        const result_cell = create_cell(result_text);
        const date_cell = create_cell(format_date(result.timestamp));

        row.appendChild(x_cell);
        row.appendChild(y_cell);
        row.appendChild(r_cell);
        row.appendChild(result_cell);
        row.appendChild(date_cell);

        results_body.appendChild(row);
    }

    redraw_canvas();
}

function button_send_form(event) {
    event.preventDefault();

    form_error.textContent = '';

    try {
        const values = get_form_values();

        const x = values.x;
        const y = values.y;
        const r = values.r;

        const hit = is_point_inside(x, y, r);
        const current_time = Date.now();

        const result = {
            x: x,
            y: y,
            r: r,
            hit: hit,
            timestamp: current_time
        };

        results.push(result);

        save_results();
        render_results();
    } catch (error) {
        form_error.textContent = error.message;
    }
}

form.addEventListener('submit', button_send_form);

form.addEventListener('change', save_form_state);

y_input.addEventListener('input', save_form_state);

load_form_state();
validate_y();

sort_param.addEventListener('change', render_results);
sort_option.addEventListener('change', render_results);

all_points.addEventListener('change', redraw_canvas);
sort_points_param.addEventListener('change', redraw_canvas);

render_results();

const canvas = document.getElementById('canvas');

canvas.addEventListener('click', canvas_click);
canvas.addEventListener('mousemove', canvas_target);
canvas.addEventListener('mouseleave', () => {
    canvas_hover = false;
    redraw_canvas();
});
