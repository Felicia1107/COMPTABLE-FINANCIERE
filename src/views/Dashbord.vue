<script>
import { ref, onMounted, watch, nextTick } from 'vue';
import dashboardService from '@/services/dashboardService';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default {
  setup() {
    const selectedYear = ref(new Date().getFullYear());
    const financialData = ref([]);
    const loading = ref(false);
    const chartCanvas = ref(null);
    let chartInstance = null;

    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const loadData = async () => {
      try {
        loading.value = true;
        financialData.value = await dashboardService.getFinancialDashboardData(selectedYear.value);
        updateChart();
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
      } finally {
        loading.value = false;
      }
    };

    const updateChart = () => {
      if (!financialData.value.length) return;

      nextTick(() => {
        if (chartInstance) {
          chartInstance.destroy();
        }

        const ctx = chartCanvas.value.getContext('2d');

        const labels = financialData.value.map(item => getMonthName(item.month));
        const revenues = financialData.value.map(item => item.revenue);
        const expenses = financialData.value.map(item => item.expenses);
        const results = financialData.value.map(item => item.netResult);

        chartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Chiffre d\'affaires',
                data: revenues,
                borderColor: '#4bc0c0',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.3,
                fill: true
              },
              {
                label: 'Charges',
                data: expenses,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.3,
                fill: true
              },
              {
                label: 'Résultat net',
                data: results,
                borderColor: '#36a2eb',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                tension: 0.3,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                  }
                }
              }
            },
            scales: {
              y: {
                ticks: {
                  callback: function (value) {
                    return formatCurrency(value);
                  }
                }
              }
            }
          }
        });
      });
    };

    const getMonthName = (monthIndex) => months[monthIndex];

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
      }).format(value);
    };

    onMounted(() => {
      loadData();
    });

    watch(financialData, () => {
      updateChart();
    });

    return {
      selectedYear,
      financialData,
      loading,
      chartCanvas,
      loadData,
      getMonthName,
      formatCurrency
    };
  }
};
</script>


<template>
  <div class="dashboard">
    <h2>Dashboard Financier</h2>

    <div class="controls">
      <label>Année: </label>
      <input type="number" v-model.number="selectedYear" @change="loadData" min="2020"
        :max="new Date().getFullYear()" />
      <button @click="loadData">Rafraîchir</button>
    </div>

    <!-- Nouveau graphique -->
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>

    <table v-if="!loading">
      <thead>
        <tr>
          <th>Mois</th>
          <th>Chiffre d'affaires</th>
          <th>Charges</th>
          <th>Résultat</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(data, index) in financialData" :key="index">
          <td>{{ getMonthName(data.month) }}</td>
          <td>{{ formatCurrency(data.revenue) }}</td>
          <td>{{ formatCurrency(data.expenses) }}</td>
          <td :class="{ positive: data.netResult > 0, negative: data.netResult < 0 }">
            {{ formatCurrency(data.netResult) }}
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="loading">Chargement en cours...</div>
  </div>
</template>


<style scoped>
.dashboard {
  max-width: 900px;
  margin: 0 auto;
}

.controls {
  margin: 20px 0;
  display: flex;
  gap: 10px;
  align-items: center;
}

.chart-container {
  height: 300px;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px;
  text-align: right;
  border-bottom: 1px solid #ddd;
}

th:first-child,
td:first-child {
  text-align: left;
}

.positive {
  color: green;
}

.negative {
  color: red;
}

.loading {
  padding: 20px;
  text-align: center;
}
</style>