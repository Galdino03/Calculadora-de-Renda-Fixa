let chartInstance = null;

/* ===============================
   CÁLCULO DE FERIADOS MÓVEIS (ALGORITMO DE MEEUS)
================================ */

function calcularPascoa(ano) {
    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(ano, mes - 1, dia);
}

function adicionarDias(data, dias) {
    const resultado = new Date(data);
    resultado.setDate(resultado.getDate() + dias);
    return resultado;
}

function formatarData(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function gerarFeriadosAno(ano) {
    const feriados = [];

    // Feriados fixos
    feriados.push(`${ano}-01-01`); // Ano Novo
    feriados.push(`${ano}-04-21`); // Tiradentes
    feriados.push(`${ano}-05-01`); // Dia do Trabalho
    feriados.push(`${ano}-09-07`); // Independência
    feriados.push(`${ano}-10-12`); // N. Sra. Aparecida
    feriados.push(`${ano}-11-02`); // Finados
    feriados.push(`${ano}-11-15`); // Proclamação da República
    feriados.push(`${ano}-11-20`); // Consciência Negra
    feriados.push(`${ano}-12-25`); // Natal

    // Feriados móveis (baseados na Páscoa)
    const pascoa = calcularPascoa(ano);
    feriados.push(formatarData(adicionarDias(pascoa, -47))); // Carnaval (segunda)
    feriados.push(formatarData(adicionarDias(pascoa, -46))); // Carnaval (terça)
    feriados.push(formatarData(adicionarDias(pascoa, -2)));  // Sexta-feira Santa
    feriados.push(formatarData(adicionarDias(pascoa, 60)));  // Corpus Christi

    return feriados;
}

// Gerar cache de feriados 2024-2050
const feriadosNacionais = {};
for (let ano = 2024; ano <= 2050; ano++) {
    feriadosNacionais[ano] = gerarFeriadosAno(ano);
}

/* ===============================
   CÁLCULO DE DIAS ÚTEIS
================================ */

function contarDiasUteis(dataInicio, dataFim) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    let diasUteis = 0;

    // Coletar todos os feriados do período
    const feriadosSet = new Set();
    for (let ano = inicio.getFullYear(); ano <= fim.getFullYear(); ano++) {
        if (feriadosNacionais[ano]) {
            feriadosNacionais[ano].forEach(f => feriadosSet.add(f));
        }
    }

    // Contar dias úteis
    const current = new Date(inicio);
    while (current <= fim) {
        const diaSemana = current.getDay();
        const dataStr = current.toISOString().split('T')[0];

        // Não é sábado (6), não é domingo (0), não é feriado
        if (diaSemana !== 0 && diaSemana !== 6 && !feriadosSet.has(dataStr)) {
            diasUteis++;
        }

        current.setDate(current.getDate() + 1);
    }

    return diasUteis;
}

function contarDiasCorridos(dataInicio, dataFim) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diffTime = Math.abs(fim - inicio);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/* ===============================
   UTILIDADES
================================ */

function formatBRL(value) {
    if (isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function getValue(id) {
    const el = document.getElementById(id);
    if (!el || el.value === '') return 0;
    return parseFloat(el.value);
}

function getDate(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
}

/* ===============================
   IMPOSTO DE RENDA
================================ */

function incomeTaxRate(diasCorridos) {
    if (diasCorridos <= 180) return 0.225;   // Até 6 meses
    if (diasCorridos <= 360) return 0.20;    // 6 a 12 meses
    if (diasCorridos <= 720) return 0.175;   // 12 a 24 meses
    return 0.15;                              // Acima de 24 meses
}

/* ===============================
   CÁLCULOS FINANCEIROS (CAPITALIZAÇÃO DIÁRIA)
================================ */

function calculatePrefixed({ amount, rateAnnual, diasUteis, taxRate }) {
    const dailyRate = Math.pow(1 + rateAnnual / 100, 1 / 252) - 1;
    const gross = amount * Math.pow(1 + dailyRate, diasUteis);
    const tax = (gross - amount) * taxRate;
    return { gross, net: gross - tax, taxRate };
}

function calculateCDIPercentage({ amount, percentCDI, cdiAnnual, diasUteis, taxRate }) {
    const dailyRate = Math.pow(1 + cdiAnnual / 100, 1 / 252) - 1;
    const adjustedDailyRate = dailyRate * (percentCDI / 100);
    const gross = amount * Math.pow(1 + adjustedDailyRate, diasUteis);
    const tax = (gross - amount) * taxRate;
    return { gross, net: gross - tax, taxRate };
}

function calculateIPCAPlus({ amount, ipcaAnnual, spreadAnnual, diasUteis, taxRate }) {
    const totalRate = (1 + ipcaAnnual / 100) * (1 + spreadAnnual / 100) - 1;
    const dailyRate = Math.pow(1 + totalRate, 1 / 252) - 1;
    const gross = amount * Math.pow(1 + dailyRate, diasUteis);
    const tax = (gross - amount) * taxRate;
    return { gross, net: gross - tax, taxRate };
}

/* ===============================
   MOTOR PRINCIPAL
================================ */

function calculateAll() {
    const amount = getValue('amount');
    const dataInicio = getDate('dataInicio');
    const dataFim = getDate('dataFim');

    if (!amount || !dataInicio || !dataFim) {
        clearResults();
        return;
    }

    const diasUteis = contarDiasUteis(dataInicio, dataFim);
    const diasCorridos = contarDiasCorridos(dataInicio, dataFim);
    const taxRate = incomeTaxRate(diasCorridos);

    // Atualizar display de informações
    document.getElementById('infoPeriodCard').style.display = 'block';
    document.getElementById('diasCorridosDisplay').textContent = diasCorridos;
    document.getElementById('diasUteisDisplay').textContent = diasUteis;
    document.getElementById('taxaIRDisplay').textContent = (taxRate * 100).toFixed(2) + '%';

    const cdiAnnual = getValue('cdiAnnual');
    const ipcaAnnual = getValue('ipcaAnnual');

    const investments = [];

    function push(name, result) {
        investments.push({ name, invested: amount, ...result });
    }

    if (getValue('rateCdbIpcaFix') > 0)
        push('CDB IPCA+', calculateIPCAPlus({
            amount, ipcaAnnual,
            spreadAnnual: getValue('rateCdbIpcaFix'),
            diasUteis, taxRate
        }));

    if (getValue('rateCdbPre') > 0)
        push('CDB Pré', calculatePrefixed({
            amount,
            rateAnnual: getValue('rateCdbPre'),
            diasUteis, taxRate
        }));

    if (getValue('rateCdbPos') > 0)
        push('CDB Pós', calculateCDIPercentage({
            amount,
            percentCDI: getValue('rateCdbPos'),
            cdiAnnual, diasUteis, taxRate
        }));

    if (getValue('rateLciIpcaFix') > 0)
        push('LCI IPCA+', calculateIPCAPlus({
            amount, ipcaAnnual,
            spreadAnnual: getValue('rateLciIpcaFix'),
            diasUteis, taxRate: 0
        }));

    if (getValue('rateLciPre') > 0)
        push('LCI Pré', calculatePrefixed({
            amount,
            rateAnnual: getValue('rateLciPre'),
            diasUteis, taxRate: 0
        }));

    if (getValue('rateLciPos') > 0)
        push('LCI Pós', calculateCDIPercentage({
            amount,
            percentCDI: getValue('rateLciPos'),
            cdiAnnual, diasUteis, taxRate: 0
        }));

    if (!investments.length) {
        clearResults();
        return;
    }

    investments.sort((a, b) => b.net - a.net);

    document.getElementById('resultsPlaceholder').style.display = 'none';
    document.getElementById('actualResults').style.display = 'block';

    updateChart(investments);
    updateDetails(investments);
}

/* ===============================
   GRÁFICO
================================ */

function updateChart(results) {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: results.map(r => r.name),
            datasets: [{
                data: results.map(r => r.net),
                backgroundColor: results.map((_, i) =>
                    i === 0 ? '#10b981' : '#3b82f6'
                ),
                borderRadius: 10,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 41, 66, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#2d4a6f',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => formatBRL(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(59, 130, 246, 0.1)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 11,
                            family: "'Plus Jakarta Sans', sans-serif"
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(59, 130, 246, 0.15)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        callback: (value) => formatBRL(value),
                        color: '#94a3b8',
                        font: {
                            size: 11,
                            family: "'Plus Jakarta Sans', sans-serif"
                        },
                        padding: 8
                    }
                }
            }
        }
    });
}

/* ===============================
   DETALHES
================================ */

function updateDetails(results) {
    const container = document.getElementById('detailsContainer');
    container.innerHTML = '';

    results.forEach((r, i) => {
        const div = document.createElement('div');
        div.className = i === 0 ? 'detail-card winner' : 'detail-card';

        const tax = r.gross - r.net;
        const realReturn = ((r.net / r.invested - 1) * 100).toFixed(2);

        div.innerHTML = `
            <div class="detail-header">
                <div class="detail-name">
                    ${i === 0 ? '<i class="fa-solid fa-trophy"></i>' : ''}
                    ${r.name}
                </div>
                <div class="detail-value">${formatBRL(r.net)}</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(r.net / results[0].net) * 100}%"></div>
            </div>
            <div class="detail-metrics">
                <div class="metric">
                    <span class="metric-label">Bruto</span>
                    <span class="metric-value">${formatBRL(r.gross)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">IR</span>
                    <span class="metric-value">${r.taxRate === 0 ? 'Isento' : formatBRL(tax)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Líquido</span>
                    <span class="metric-value">${formatBRL(r.net)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Real A.A.</span>
                    <span class="metric-value">${realReturn}%</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function clearResults() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    document.getElementById('resultsPlaceholder').style.display = 'block';
    document.getElementById('actualResults').style.display = 'none';
    document.getElementById('detailsContainer').innerHTML = '';
    document.getElementById('infoPeriodCard').style.display = 'none';
}

/* ===============================
   EVENTOS
================================ */

document.getElementById('btnCalculate').addEventListener('click', calculateAll);

document.addEventListener('input', (e) => {
    if (e.target.type === 'number' || e.target.type === 'date' || e.target.tagName === 'SELECT') {
        calculateAll();
    }
});
