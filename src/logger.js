const config = require('./config.js');

class Logger {
  httpLogger = (req, res, next) => {
    let send = res.send;
    res.send = (resBody) => {
      const logData = {
        authorized: !!req.headers.authorization,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        reqBody: JSON.stringify(req.body),
        resBody: JSON.stringify(resBody),
      };




      
      const level = this.statusToLogLevel(res.statusCode);
      this.log(level, 'http-req', logData);
      res.send = send;
      return res.send(resBody);
    };
    next();
  };














  log(level, type, logData) {
    if (!config.logging) {
      return;
    }






    const labels = { component: config.logging.source, level: level, type: type };
    const values = [this.nowString(), this.sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  logDatabase(sql, params) {
    if (!config.logging) {
      return;
    }





    const logData = {
      sql: sql,



      params: params ? JSON.stringify(params) : null,
    };
    this.log('info', 'db-req', logData);
  }





  logFactoryRequest(requestBody, responseBody, statusCode) {
    if (!config.logging) {
      return;
    }





    const logData = {
      factoryRequest: JSON.stringify(requestBody),
      factoryResponse: JSON.stringify(responseBody),
      statusCode: statusCode,
    };
    const level = this.statusToLogLevel(statusCode);
    this.log(level, 'factory-req', logData);
  }






  logException(err, req) {
    if (!config.logging) {
      return;
    }






    const logData = {
      message: err.message,
      stack: err.stack,
      path: req?.originalUrl || 'unknown',
      method: req?.method || 'unknown',
      statusCode: err.statusCode || 500,
    };
    this.log('error', 'exception', logData);
  }






  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }





  nowString() {
    return (Date.now() * 1000000).toString();
  }

  sanitize(logData) {
    let sanitized = JSON.stringify(logData);
    sanitized = sanitized.replace(/"password"\s*:\s*"[^"]*"/gi, '"password": "****"');
    sanitized = sanitized.replace(/"token"\s*:\s*"[^"]*"/g, '"token": "****"');
    sanitized = sanitized.replace(/"authorization"\s*:\s*"[^"]*"/g, '"authorization": "****"');
    return sanitized;
  }









  sendLogToGrafana(event) {
    if (!config.logging || !config.logging.url || !config.logging.apiKey) {
      return;
      




    }









    const body = JSON.stringify(event);
    fetch(`${config.logging.url}`, {
      method: 'post',
      body: body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,



      },
    }).then((res) => {
      if (!res.ok) {
        console.log('Failed to send log to Grafana');
      }


    }).catch((err) => {
      console.log('Error sending log to Grafana:', err.message);
    });
  }
}







module.exports = new Logger();

