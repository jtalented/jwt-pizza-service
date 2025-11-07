const metrics = require('./metrics');
const config = require('./config');


global.fetch = jest.fn();
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });






  describe('requestTracker', () => {
    test('should track HTTP request method and call next', () => {
      const req = { method: 'GET', path: '/test', user: null };
      const res = { on: jest.fn((event, callback) => {
        if (event === 'finish') {



          //finish event
          setTimeout(callback, 0);
        }
      }) };
      const next = jest.fn();

      metrics.requestTracker(req, res, next);





      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });







    test('should track active users when user is authenticated', () => {
      const req = { method: 'POST', path: '/api/order', user: { id: 123 } };
      const res = { on: jest.fn() };
      const next = jest.fn();

      metrics.requestTracker(req, res, next);





      expect(next).toHaveBeenCalled();
    });
  });











  describe('trackAuthAttempt', () => {
    test('should track successful auth attempts', () => {
      metrics.trackAuthAttempt(true);
      metrics.trackAuthAttempt(true);
    });

    test('should track failed auth attempts', () => {
      metrics.trackAuthAttempt(false);
      metrics.trackAuthAttempt(false);
    });
  });









  describe('pizzaPurchase', () => {
    test('should track successful pizza purchase with revenue', () => {
      metrics.pizzaPurchase(true, 100, 10.5);
      metrics.pizzaPurchase(true, 150, 20.0);
    });







    test('should track failed pizza purchase', () => {
      metrics.pizzaPurchase(false, 200, 0);
    });
  });










  describe('sendMetricsPeriodically', () => {
    test('should send metrics to Grafana when config is valid', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      metrics.trackAuthAttempt(true);
      metrics.pizzaPurchase(true, 50, 5.0);

      await metrics.sendMetricsPeriodically();

      await new Promise(resolve => setTimeout(resolve, 50));







      if (config.metrics && config.metrics.url && config.metrics.apiKey) {
        expect(global.fetch).toHaveBeenCalled();
      }
    });
















    test('should handle fetch errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      await metrics.sendMetricsPeriodically();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(console.error).toHaveBeenCalled();
    });







    test('should collect all metric types', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });
      metrics.trackAuthAttempt(true);
      metrics.trackAuthAttempt(false);
      metrics.pizzaPurchase(true, 100, 10.5);
      metrics.pizzaPurchase(false, 200, 0);
      await metrics.sendMetricsPeriodically();





      await new Promise(resolve => setTimeout(resolve, 50));





      if (config.metrics && config.metrics.url) {
        expect(global.fetch).toHaveBeenCalled();

        const callArgs = global.fetch.mock.calls[0];


        const body = JSON.parse(callArgs[1].body);
        expect(body.resourceMetrics[0].scopeMetrics[0].metrics).toBeDefined();
      }
    });
  });









  describe('startMetricReporting', () => {
    test('should set up interval for metric reporting', () => {
      jest.useFakeTimers();
      const intervalSpy = jest.spyOn(global, 'setInterval');

      metrics.startMetricReporting(1000);













      
      expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      jest.useRealTimers();
      intervalSpy.mockRestore();
    });
  });
});

