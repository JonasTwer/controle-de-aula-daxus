// Simulação do cálculo de conclusão estimada - Jonas Ferreira
// Objetivo: Descobrir por que o dashboard mostra 01/04 e o cálculo manual deu 05/03

console.log('=== SIMULAÇÃO CÁLCULO JONAS FERREIRA ===\n');

// DADOS DO BANCO (19/01/2026)
const jonasData = {
    email: 'jonas.ramos@trt14.jus.br',
    aulas_concluidas: 5,
    total_aulas: 462,
    aulas_restantes: 457,
    tempo_total_segundos: 2021,
    tempo_total_minutos: 33.68,
    tempo_medio_segundos: 404.20,
    tempo_medio_minutos: 6.74,
    dias_ativos: 1,
    primeira_aula: '2026-01-14',
    ultima_aula: '2026-01-14',
    aulas: [
        { titulo: 'Introdução', duration_sec: 169, duration_min: 2.82 },
        { titulo: 'Apresentação da Plataforma', duration_sec: 167, duration_min: 2.78 },
        { titulo: 'Por que Python?', duration_sec: 476, duration_min: 7.93 },
        { titulo: 'Introdução ao Google Colab', duration_sec: 347, duration_min: 5.78 },
        { titulo: 'Acessando o Google Colab', duration_sec: 862, duration_min: 14.37 }
    ]
};

// Configurações V3.0
const CONFIG = {
    BAYES_C: 7,
    GLOBAL_VELOCITY_PRIOR: 5.0,
    CREDIT_DIVISOR: 15,
    EWMA_ALPHA: 0.2,
    COLD_START_DAYS: 14,
    EPSILON: 0.1
};

// Função de peso (mesmo do código)
const calculateWeight = (durationMinutes) => {
    return Math.max(0.1, durationMinutes / CONFIG.CREDIT_DIVISOR);
};

// ETAPA 1: Calcular dias ativos
const firstCompletedDate = new Date(jonasData.primeira_aula + 'T00:00:00');
const today = new Date('2026-01-19T00:00:00'); // Data base
const daysActive = Math.max(1, Math.ceil((today.getTime() - firstCompletedDate.getTime()) / (1000 * 60 * 60 * 24)));

console.log('ETAPA 1: Dias Ativos');
console.log(`  Primeira aula: ${jonasData.primeira_aula}`);
console.log(`  Data base: 19/01/2026`);
console.log(`  Dias ativos: ${daysActive} dias\n`);

// ETAPA 2: Calcular créditos obtidos
console.log('ETAPA 2: Créditos Obtidos');
let completedCredits = 0;
jonasData.aulas.forEach((aula, i) => {
    const credit = calculateWeight(aula.duration_min);
    completedCredits += credit;
    console.log(`  Aula ${i + 1}: ${aula.duration_min.toFixed(2)} min / 15 = ${credit.toFixed(2)} créditos`);
});
console.log(`  TOTAL: ${completedCredits.toFixed(2)} créditos\n`);

// ETAPA 3: Estimar créditos restantes
const avgCreditPerLesson = completedCredits / jonasData.aulas_concluidas;
const remainingCredits = avgCreditPerLesson * jonasData.aulas_restantes;

console.log('ETAPA 3: Créditos Restantes');
console.log(`  Crédito médio/aula: ${completedCredits.toFixed(2)} / ${jonasData.aulas_concluidas} = ${avgCreditPerLesson.toFixed(2)}`);
console.log(`  Créditos restantes: ${avgCreditPerLesson.toFixed(2)} × ${jonasData.aulas_restantes} = ${remainingCredits.toFixed(2)} créditos\n`);

// ETAPA 4: Calcular velocidade (Bayesian Smoothing - COLD_START)
let velocity;
let phase;

if (daysActive <= CONFIG.COLD_START_DAYS) {
    phase = 'COLD_START';
    const C = CONFIG.BAYES_C;
    const prior = CONFIG.GLOBAL_VELOCITY_PRIOR;
    velocity = (C * prior + completedCredits) / (C + daysActive);

    console.log('ETAPA 4: Velocidade (Bayesian Smoothing)');
    console.log(`  Fase: ${phase}`);
    console.log(`  C = ${C}, Prior = ${prior} créd/dia`);
    console.log(`  Fórmula: (${C} × ${prior} + ${completedCredits.toFixed(2)}) / (${C} + ${daysActive})`);
    console.log(`         = (${(C * prior).toFixed(2)} + ${completedCredits.toFixed(2)}) / ${(C + daysActive)}`);
    console.log(`         = ${(C * prior + completedCredits).toFixed(2)} / ${(C + daysActive)}`);
    console.log(`  Velocidade: ${velocity.toFixed(2)} créd/dia\n`);
}

// ETAPA 5: Projetar data de conclusão
const days = Math.ceil(remainingCredits / Math.max(velocity, CONFIG.EPSILON));
const conclusionDate = new Date(today);
conclusionDate.setDate(conclusionDate.getDate() + days);

console.log('ETAPA 5: Projeção de Conclusão');
console.log(`  Fórmula: ⌈${remainingCredits.toFixed(2)} / ${velocity.toFixed(2)}⌉`);
console.log(`         = ⌈${(remainingCredits / velocity).toFixed(2)}⌉`);
console.log(`  Dias restantes: ${days} dias`);
console.log(`  Data base: ${today.toLocaleDateString('pt-BR')}`);
console.log(`  Data conclusão: ${conclusionDate.toLocaleDateString('pt-BR')}\n`);

// COMPARAÇÃO
console.log('=== COMPARAÇÃO ===');
console.log(`Dashboard mostra: 01/04 (presumivelmente 01/04/2026)`);
console.log(`Cálculo atual:    ${conclusionDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`);
console.log(`Diferença:        ${Math.abs(new Date('2026-04-01').getTime() - conclusionDate.getTime()) / (1000 * 60 * 60 * 24)} dias\n`);

// INVESTIGAÇÃO: Testar diferentes cenários
console.log('=== INVESTIGAÇÃO DE CENÁRIOS ===\n');

// Cenário 1: E se dias_ativos for diferente?
console.log('Cenário 1: Diferentes valores de dias_ativos');
for (let testDays = 1; testDays <= 10; testDays++) {
    const testVelocity = (CONFIG.BAYES_C * CONFIG.GLOBAL_VELOCITY_PRIOR + completedCredits) / (CONFIG.BAYES_C + testDays);
    const testDaysRemaining = Math.ceil(remainingCredits / testVelocity);
    const testDate = new Date(today);
    testDate.setDate(testDate.getDate() + testDaysRemaining);

    console.log(`  dias_ativos = ${testDays}: Velocidade = ${testVelocity.toFixed(2)}, Dias = ${testDaysRemaining}, Data = ${testDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`);

    if (testDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === '01/04') {
        console.log(`    ⭐ MATCH! Este valor produz 01/04`);
    }
}

console.log('\nCenário 2: E se o prior for diferente?');
const priors = [3.0, 4.0, 5.0, 6.0, 7.0];
priors.forEach(testPrior => {
    const testVelocity = (CONFIG.BAYES_C * testPrior + completedCredits) / (CONFIG.BAYES_C + daysActive);
    const testDaysRemaining = Math.ceil(remainingCredits / testVelocity);
    const testDate = new Date(today);
    testDate.setDate(testDate.getDate() + testDaysRemaining);

    console.log(`  Prior = ${testPrior}: Velocidade = ${testVelocity.toFixed(2)}, Dias = ${testDaysRemaining}, Data = ${testDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`);

    if (testDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === '01/04') {
        console.log(`    ⭐ MATCH! Este prior produz 01/04`);
    }
});

console.log('\nCenário 3: E se a data base for 14/01 (dia da última aula)?');
const altToday = new Date('2026-01-14T00:00:00');
const altDaysActive = 1; // Primeiro dia
const altVelocity = (CONFIG.BAYES_C * CONFIG.GLOBAL_VELOCITY_PRIOR + completedCredits) / (CONFIG.BAYES_C + altDaysActive);
const altDays = Math.ceil(remainingCredits / altVelocity);
const altDate = new Date(altToday);
altDate.setDate(altDate.getDate() + altDays);

console.log(`  Data base: ${altToday.toLocaleDateString('pt-BR')}`);
console.log(`  dias_ativos: ${altDaysActive}`);
console.log(`  Velocidade: ${altVelocity.toFixed(2)}`);
console.log(`  Dias restantes: ${altDays}`);
console.log(`  Data conclusão: ${altDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`);

if (altDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === '01/04') {
    console.log(`  ⭐ MATCH! Data base 14/01 produz 01/04`);
}
