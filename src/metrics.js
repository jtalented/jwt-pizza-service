const config = require('./config');
const os = require('os');
const httpRequests = {};
const authAttempts = { successful: 0, failed: 0 };
const pizzaPurchases = { successful: 0, failed: 0, revenue: 0 };
const pizzaLatencies = [];
const endpointLatencies = {};
const activeUserIds = new Set();

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();




//
function requestTracker(req, res, next) {
  const startTime = Date.now();
  const method = req.method;
  
  httpRequests[method] = (httpRequests[method] || 0) + 1;
  
  //track active users
  if (req.user && req.user.id) {
    activeUserIds.add(req.user.id);
  }
  








  //Track endpoint latency
  const endpoint = `${req.method} ${req.path}`;
  res.on('finish', () => {
    const latency = Date.now() - startTime;
    if (!endpointLatencies[endpoint]) {
      endpointLatencies[endpoint] = [];
    }
    endpointLatencies[endpoint].push(latency);
  });
  
  next();
}










//track authentication attempts
function trackAuthAttempt(successful) {
  if (successful) {
    authAttempts.successful++;
  } else {
    authAttempts.failed++;
  }
}











//track pizza purchase
function pizzaPurchase(successful, latency, price) {
  if (successful) {
    pizzaPurchases.successful++;
    pizzaPurchases.revenue += price;
  } else {
    pizzaPurchases.failed++;
  }
  pizzaLatencies.push(latency);
}








// Get CPU usage percentage
function getCpuUsagePercentage() {
  const currentCpuUsage = process.cpuUsage();
  const currentTime = Date.now();
  
  const timeDelta = (currentTime - lastCpuTime) * 1000;
  
  if (timeDelta <= 0 || timeDelta < 10000) {
    lastCpuUsage = currentCpuUsage;
    lastCpuTime = currentTime;
    return 0;
  }
  
  const userDelta = currentCpuUsage.user - lastCpuUsage.user;
  const systemDelta = currentCpuUsage.system - lastCpuUsage.system;
  const totalDelta = userDelta + systemDelta;
  

  lastCpuUsage = currentCpuUsage;
  lastCpuTime = currentTime;
  
  const cpuCount = os.cpus().length;
  const cpuPercentage = (totalDelta / timeDelta) * 100 / cpuCount;
  
  if (isNaN(cpuPercentage) || !isFinite(cpuPercentage)) {
    const loadAvg = os.loadavg()[0];
    const cpuUsage = (loadAvg / cpuCount) * 100;
    return parseFloat(cpuUsage.toFixed(2));
  }
  
  return parseFloat(cpuPercentage.toFixed(2));
}









//get memory usage percentage
function getMemoryUsagePercentage() {




  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return parseFloat(memoryUsage.toFixed(2));
}









//active users count
function getActiveUsersCount() {



  //return the count of unique user IDs
  return activeUserIds.size;
}










// Create a metric
function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
  attributes = { ...attributes, source: config.metrics.source };










  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: String(attributes[key]) },
    });
  });

  if (metricType === 'sum') {
    metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[metricType].isMonotonic = true;
  }

  return metric;
}













//send metrics to Grafana
async function sendMetricsToGrafana(metrics) {
  if (!config.metrics || !config.metrics.url || !config.metrics.apiKey) {
    console.error('Metrics configuration missing. Cannot send metrics to Grafana.');
    console.error('Config.metrics exists:', !!config.metrics);
    console.error('Config.metrics.url exists:', !!(config.metrics && config.metrics.url));
    console.error('Config.metrics.apiKey exists:', !!(config.metrics && config.metrics.apiKey));
    return;
  }
  
  console.log(`Sending ${metrics.length} metrics to Grafana at ${config.metrics.url}`);

  const body = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };








  try {
    const response = await fetch(config.metrics.url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${config.metrics.apiKey}`,
        'Content-Type': 'application/json',
      },
    });





    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`Grafana API error: HTTP ${response.status} - ${errorText}`);
      throw new Error(`HTTP status: ${response.status}`);
    }
    console.log(`Successfully sent ${metrics.length} metrics to Grafana`);
  } catch (error) {
    console.error('Error pushing metrics:', error.message);
  }
}









//send all metrics
async function sendMetricsPeriodically() {
  try {
    console.log('sendMetricsPeriodically called');
    const metrics = [];
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];


    let totalRequests = 0;
    methods.forEach((method) => {
      const count = (httpRequests[method] || 0) * 6;
      totalRequests += (httpRequests[method] || 0);
      metrics.push(createMetric('http_requests_per_minute', count, '1', 'gauge', 'asInt', { method }));
    });
    
    //totals
    metrics.push(createMetric('http_requests_per_minute', totalRequests * 6, '1', 'gauge', 'asInt', { method: 'TOTAL' }));








    //auth metrics
    metrics.push(createMetric('auth_attempts_per_minute', authAttempts.successful * 6, '1', 'gauge', 'asInt', { status: 'successful' }));
    metrics.push(createMetric('auth_attempts_per_minute', authAttempts.failed * 6, '1', 'gauge', 'asInt', { status: 'failed' }));

    //active users
    const activeUsers = getActiveUsersCount();
    metrics.push(createMetric('active_users', activeUsers, '1', 'gauge', 'asInt', {}));

    //system
    const cpuUsage = getCpuUsagePercentage();
    metrics.push(createMetric('cpu_usage_percentage', cpuUsage, '%', 'gauge', 'asDouble', {}));




    const memoryUsage = getMemoryUsagePercentage();
    metrics.push(createMetric('memory_usage_percentage', memoryUsage, '%', 'gauge', 'asDouble', {}));





     //pizza
     metrics.push(createMetric('pizzas_sold_per_minute', pizzaPurchases.successful * 6, '1', 'gauge', 'asInt', {}));
     metrics.push(createMetric('pizza_creation_failures_per_minute', pizzaPurchases.failed * 6, '1', 'gauge', 'asInt', {}));
     // Revenue per minute
     metrics.push(createMetric('pizza_revenue_per_minute', pizzaPurchases.revenue * 6, '1', 'gauge', 'asDouble', {}));

    //latency
    const endpointKeys = Object.keys(endpointLatencies);
    if (endpointKeys.length > 0) {
      endpointKeys.forEach((endpoint) => {
        const latencies = endpointLatencies[endpoint];
        if (latencies.length > 0) {
          const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
          metrics.push(createMetric('endpoint_latency_ms', avgLatency, 'ms', 'gauge', 'asDouble', { endpoint }));
        }
      });
    }







    //pizza latecny
    const avgPizzaLatency = pizzaLatencies.length > 0 
      ? pizzaLatencies.reduce((sum, l) => sum + l, 0) / pizzaLatencies.length 
      : 0;
    metrics.push(createMetric('pizza_creation_latency_ms', avgPizzaLatency, 'ms', 'gauge', 'asDouble', {}));

    if (metrics.length > 0) {
      console.log(`Prepared ${metrics.length} metrics, calling sendMetricsToGrafana`);
      await sendMetricsToGrafana(metrics);
    } else {
      console.log('No metrics to send');
    }





    // Reset
    methods.forEach((method) => {
      httpRequests[method] = 0;
    });
    




    authAttempts.successful = 0;
    authAttempts.failed = 0;
    

    pizzaPurchases.successful = 0;
    pizzaPurchases.failed = 0;
    pizzaPurchases.revenue = 0;
    

    activeUserIds.clear();
    
    pizzaLatencies.length = 0;
    Object.keys(endpointLatencies).forEach((endpoint) => {
      endpointLatencies[endpoint] = [];
    });
  } catch (error) {
    console.error('Error sending metrics:', error);
  }
}




// Startreporting
function startMetricReporting(period = 10000) {
  console.log(`Starting metric reporting with period ${period}ms`);
  setInterval(() => {
    sendMetricsPeriodically();
  }, period);
}

module.exports = {
  requestTracker,
  trackAuthAttempt,
  pizzaPurchase,
  startMetricReporting,
  sendMetricsPeriodically,
};

