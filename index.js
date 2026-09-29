console.log('Happy developing ✨')
// function draw () {
//     const canvas = document.getElementById('canvas');
//     const ctx = canvas.getContext('2d');
//
//     let y = 0
//     for (let i = 0; i < 40; i++) {
//         let x = 0
//         for (let j = 0; j < 40; j++) {
//             ctx.fillStyle = `rgb(${Math.floor(256 - (256/40)*j)} ` + `${Math.floor(256 - (256/40)*i)} 0)`;
//             ctx.fillRect(x, y, 10, 10)
//             x += 10
//         }
//         y += 10
//     }
// }
// draw()

function draw () {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // ctx.fillStyle = 'rgb(0 160 255)';
    ctx.fillStyle = 'rgb(0 160 255)';
    ctx.fillRect(250, 250, 160, 160);

    ctx.beginPath();
    ctx.moveTo(250, 250);
    ctx.lineTo(410, 250);
    ctx.lineTo(250, 170);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(170, 250);
    ctx.arc(250, 250, 80, Math.PI, Math.PI / 2, true)
    ctx.lineTo(250, 250);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(50, 250);
    ctx.lineTo(450, 250);

    ctx.moveTo(250, 50);
    ctx.lineTo(250, 450);

    ctx.moveTo(250, 50);
    ctx.lineTo(240, 70);

    ctx.moveTo(250, 50);
    ctx.lineTo(260, 70);

    ctx.moveTo(450, 250);
    ctx.lineTo(430, 240);

    ctx.moveTo(450, 250);
    ctx.lineTo(430, 260);

    ctx.moveTo(245, 90);
    ctx.lineTo(255, 90);

    ctx.moveTo(245, 170);
    ctx.lineTo(255, 170);

    ctx.moveTo(245, 330);
    ctx.lineTo(255, 330);

    ctx.moveTo(245, 330);
    ctx.lineTo(255, 330);

    ctx.moveTo(245, 410);
    ctx.lineTo(255, 410);

    ctx.moveTo(410, 245);
    ctx.lineTo(410, 255);

    ctx.moveTo(330, 245);
    ctx.lineTo(330, 255);

    ctx.moveTo(170, 245);
    ctx.lineTo(170, 255);

    ctx.moveTo(90, 245);
    ctx.lineTo(90, 255);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';

    ctx.fillText('R', 255, 90);
    ctx.fillText('R/2', 255, 170);

    ctx.fillText('-R', 255, 410);
    ctx.fillText('-R/2', 255, 330);

    ctx.fillText('R/2', 330, 240);
    ctx.fillText('R', 410, 240);

    ctx.fillText('-R/2', 170, 240);
    ctx.fillText('-R', 90, 240);

    ctx.fillText('x', 455, 240);
    ctx.fillText('y', 260, 45);

}
draw();

const form = document.getElementById('form');
const y_input = document.getElementById('y_input');
const form_error = document.getElementById('form_error');
const results_body = document.getElementById('results_body');
const r_input = document.querySelectorAll('input[name="r"]');

const STORAGE_KEY = 'web_lab1_results';
let results = loadResults();

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

        return parsed_results;
    } catch {
        return [];
    }
}

function save_results() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function fix_r(event) {
    if (event.target.checked === false) {
        return;
    }

    for (const checkbox of r_input) {
        if (checkbox !== event.target) {
            checkbox.checked = false;
        }
    }
}

for (const checkbox of r_input) {
    checkbox.addEventListener('change', fix_r)
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

    if (y < -3 || y > 3) {
        return null;
    }
    return y;
}

function get_form_values() {
    const x_element = document.querySelector('input[name="x"]:checked');

    const r_elements = document.querySelectorAll('input[name="r"]:checked');

    if (x_element === null) {
        throw new Error('Выберите координату X');
    }

    const y = parse_y(y_input.value);

    if (y === null) {
        throw new Error('Y должен быть числом от −3 до 3');
    }

    if (r_elements.length !== 1) {
        throw new Error('Выберите ровно одно значение R');
    }

    return {
        x: Number(x_element.value),
        y: y,
        r: Number(r_elements[0].value)
    };
}

function is_point_inside(x, y, r) {
    const in_triangle = x >= 0 && y >= 0 && x <= r && y <= r / 2 - x / 2;

    const in_rectangle = x >= 0 && y <= 0 && y >= -r && x <= r;

    const in_circle = x <= 0 && y <= 0 && x * x + y * y <= (r / 2) ** 2;

    return in_triangle || in_rectangle || in_circle;
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

function render_results() {
    results_body.replaceChildren();

    for (let i = results.length - 1; i >= 0; i--) {
        const result = results[i];
        const row = document.createElement('tr');

        let result_text;

        if (result.hit === true) {
            result_text = 'Попадание';
            row.className = 'hit';
        } else {
            result_text = 'Промах';
            row.className = 'miss';
        }

        const x_cell = create_cell(result.x);
        const y_cell = create_cell(result.y);
        const r_cell = create_cell(result.r);
        const result_cell = create_cell(result_text);
        const date_cell = create_cell(format_date(result.timestamp));

        row.appendChild(x_cell);
        row.appendChild(y_cell);
        row.appendChild(r_cell);
        row.appendChild(result_cell);
        row.appendChild(date_cell);

        results_body.appendChild(row);
    }
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

render_results();

