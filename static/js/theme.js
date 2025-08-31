export let pieChart = null;
export let trendChart = null;
export let recurringPieChart = null;

export function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    document.getElementById('theme-toggle').innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateChartColors();
}

export function loadTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    } else {
        body.classList.remove('dark-theme');
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
}

export function updateChartColors() {
    if (pieChart) {
        pieChart.options.plugins.legend.labels.color = document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333';
        pieChart.update();
    }
    if (trendChart) {
        trendChart.options.plugins.legend.labels.color = document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333';
        trendChart.options.scales.x.title.color = document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333';
        trendChart.options.scales.y.title.color = document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333';
        trendChart.options.scales.y.grid.color = document.body.classList.contains('dark-theme') ? '#444' : '#e0e0e0';
        trendChart.update();
    }
    if (recurringPieChart) {
        recurringPieChart.options.plugins.legend.labels.color = document.body.classList.contains('dark-theme') ? '#e0e0e0' : '#333';
        recurringPieChart.update();
    }
}