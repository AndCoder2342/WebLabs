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

    ctx.fillRect(width / 2, height / 2 - r, r, r);
    ctx.strokeRect(width / 2, height / 2 - r, r, r);

    ctx.beginPath();
    ctx.moveTo(width / 2 - r / 2, height / 2);
    ctx.lineTo(width / 2, height / 2);
    ctx.lineTo(width / 2, height / 2 - r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2);
    ctx.lineTo(width / 2 + r / 2, height / 2);
    ctx.arc(width / 2, height / 2, r / 2, 0, Math.PI / 2);
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

const Y_VALUES = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
const R_VALUES = [1, 1.5, 2, 2.5, 3];

class YSelect {
    constructor(container, values) {
        const label = document.createElement('label');
        label.htmlFor = 'y_input';
        label.textContent = 'Координата Y';

        this.select = document.createElement('select');
        this.select.id = 'y_input';
        this.select.name = 'y';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Выберите Y';
        placeholder.disabled = true;
        placeholder.selected = true;
        this.select.appendChild(placeholder);

        for (const value of values) {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = String(value);
            this.select.appendChild(option);
        }

        this.error = document.createElement('span');
        this.error.className = 'field-error';
        this.error.setAttribute('aria-live', 'polite');

        container.appendChild(label);
        container.appendChild(this.select);
        container.appendChild(this.error);
    }

    get value() {
        return this.select.value;
    }

    set value(value) {
        this.select.value = value;
    }

    addEventListener(type, listener) {
        this.select.addEventListener(type, listener);
    }

    setCustomValidity(message) {
        this.select.setCustomValidity(message);
        this.error.textContent = message;
    }
}

const form = document.getElementById('form');
const x_input = document.getElementById('x_input');
const y_input = new YSelect(
    document.getElementById('y_component'),
    Y_VALUES
);
const form_error = document.getElementById('form_error');
const results_body = document.getElementById('results_body');
const r_inputs = document.querySelectorAll('input[name="r"]');

const sort_param = document.getElementById('sort_param');
const sort_option = document.getElementById('sort_option');

const all_points = document.getElementById('show_all_points');
const sort_points_param = document.getElementById('sort_points_param');
const FORM_STORAGE_KEY = 'web_lab3_form';

let results = [];
let highlighted_result = null;
let canvas_position = null;
let canvas_hover = false;

async function load_server_results() {
    const response = await fetch('/api/results');

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message);
    }
    results = await response.json();
    render_results();
}

function save_form_state() {
    const r_element = get_selected_r();

    const form_state = {
        x: x_input.value,
        y: y_input.value,
        r: r_element === null ? null : r_element.value
    };

    sessionStorage.setItem(
        FORM_STORAGE_KEY,
        JSON.stringify(form_state)
    );
}

function load_form_state() {
    const saved_state =
        sessionStorage.getItem(FORM_STORAGE_KEY);

    if (saved_state === null) {
        return;
    }

    try {
        const form_state =
            JSON.parse(saved_state);

        x_input.value = form_state.x || '';
        y_input.value = form_state.y || '';

        for (const checkbox of r_inputs) {
            checkbox.checked = checkbox.value === form_state.r;
        }
    } catch {
        sessionStorage.removeItem(
            FORM_STORAGE_KEY
        );
    }
}

function get_selected_r() {
    const selected = Array.from(r_inputs).filter(
        checkbox => checkbox.checked
    );

    if (selected.length !== 1) {
        return null;
    }

    return selected[0];
}

function select_r(event) {
    if (event.currentTarget.checked) {
        for (const checkbox of r_inputs) {
            if (checkbox !== event.currentTarget) {
                checkbox.checked = false;
            }
        }
    }

    save_form_state();
    redraw_canvas();
}

for (const checkbox of r_inputs) {
    checkbox.addEventListener('change', select_r);
}

x_input.addEventListener('input', validate_x);
x_input.addEventListener('input', redraw_canvas);
y_input.addEventListener('change', validate_y);
y_input.addEventListener('change', redraw_canvas);

function validate_x() {
    if (x_input.value !== '' && parse_x(x_input.value) === null) {
        x_input.setCustomValidity('X должен быть числом от −3 до 3');
    } else {
        x_input.setCustomValidity('');
    }
}

function validate_y() {
    if (y_input.value !== '' && parse_y(y_input.value) === null) {
        y_input.setCustomValidity('Выберите допустимое значение Y');
    } else {
        y_input.setCustomValidity('');
    }
}

function parse_number(value) {
    const normalized = value.trim().replace(',', '.');
    const number_pattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

    if (number_pattern.test(normalized) === false) {
        return null;
    }

    const number = Number(normalized);
    if (Number.isFinite(number) === false) {
        return null;
    }

    return number;
}

function parse_x(value) {
    const x = parse_number(value);

    if (x === null || x < -3 || x > 3) {
        return null;
    }

    return x;
}

function parse_y(value) {
    const y = parse_number(value);

    if (y === null || Y_VALUES.includes(y) === false) {
        return null;
    }

    return y;
}

function get_form_values() {
    const x = parse_x(x_input.value);

    if (x === null) {
        throw new Error('X должен быть числом от −3 до 3');
    }

    const y = parse_y(y_input.value);

    if (y === null) {
        y_input.setCustomValidity('Выберите координату Y');
        throw new Error('Выберите координату Y');
    }

    y_input.setCustomValidity('');

    const r_element = get_selected_r();

    if (r_element === null) {
        throw new Error('Выберите радиус R');
    }

    return {
        x: x,
        y: y,
        r: Number(r_element.value)
    };
}

function is_point_inside(x, y, r) {
    const in_square = x >= 0 && x <= r && y >= 0 && y <= r;

    const in_triangle = x >= -r / 2 && x <= 0 && y >= 0 && y <= 2 * x + r;

    const in_circle = x >= 0 && y <= 0 && x * x + y * y <= (r / 2) ** 2;

    return in_square || in_triangle || in_circle;
}

function find_nearest_y(value) {
    let nearest = Y_VALUES[0];

    for (const allowed_y of Y_VALUES) {
        if (Math.abs(allowed_y - value) < Math.abs(nearest - value)) {
            nearest = allowed_y;
        }
    }

    return nearest;
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

async function canvas_click(event) {
    form_error.textContent = '';

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

    const r_element = get_selected_r();

    if (r_element === null) {
        form_error.textContent = 'Сначала выберите радиус R';
        return;
    }

    const r = Number(r_element.value);

    let x = (canvas_x - width / 2) / scale * r;
    const raw_y = (height / 2 - canvas_y) / scale * r;

    x = Number(x.toFixed(2));
    const y = find_nearest_y(raw_y);

    if (Object.is(x, -0)) {
        x = 0;
    }

    if (parse_x(String(x)) === null) {
        form_error.textContent = 'X должен быть числом от −3 до 3';
        return;
    }

    x_input.value = String(x);
    y_input.value = String(y);
    validate_x();
    validate_y();
    save_form_state();
    redraw_canvas();

    try {
        await send_point_to_server({x: x, y: y, r: r});
    } catch (error) {
        form_error.textContent = error.message;
    }
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

    const r_element = get_selected_r();

    if (r_element === null) {
        return;
    }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const scale = Math.min(width, height) / 3;
    const canvas_x = canvas_position.x;
    const canvas_y = canvas_position.y;
    const r = Number(r_element.value);

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

    if (param === 'x') {
        new_value = parse_x(input.value);
    } else if (param === 'y') {
        new_value = parse_y(input.value);
    } else {
        const r = parse_number(input.value);
        new_value = R_VALUES.includes(r) ? r : null;
    }

    if (new_value === null) {
        if (param === 'x') {
            alert('X должен быть числом от −3 до 3');
        } else if (param === 'y') {
            alert('Выберите допустимое значение Y');
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
        //
        // const x_cell = create_special_cell(result.x, i, 'x');
        // const y_cell = create_special_cell(result.y, i, 'y');
        // const r_cell = create_special_cell(result.r, i, 'r');
        const x_cell = create_cell(result.x);
        const y_cell = create_cell(result.y);
        const r_cell = create_cell(result.r);
        const result_cell = create_cell(result_text);
        const date_cell = create_cell(format_date(result.timestamp));
        const execution_cell = create_cell(result.execution_time_ms.toFixed(3));

        row.appendChild(x_cell);
        row.appendChild(y_cell);
        row.appendChild(r_cell);
        row.appendChild(result_cell);
        row.appendChild(date_cell);
        row.appendChild(execution_cell);

        results_body.appendChild(row);
    }

    redraw_canvas();
}

async function button_send_form(event) {
    event.preventDefault();
    form_error.textContent = '';

    const submit_button = form.querySelector('button[type="submit"]');
    submit_button.disabled = true;

    try {
        const values = get_form_values();
        await send_point_to_server(values);
    } catch (error) {
        form_error.textContent = error.message;
    } finally {
        submit_button.disabled = false;
    }
}

async function send_point_to_server(values) {
    const body = new URLSearchParams({
        x: String(values.x),
        y: String(values.y),
        r: String(values.r)
    });

    const response = await fetch('/api/check', {
        method: 'POST',
        body: body
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message);
    }

    const result = await response.json();
    results.push(result);
    render_results();
}

form.addEventListener('submit', button_send_form);

form.addEventListener('change', save_form_state);
x_input.addEventListener('input', save_form_state);

load_form_state();
validate_x();
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

load_server_results().catch(error => {
    form_error.textContent = error.message;
});

// docker compose up --build -d
