const metrics = require('./metrics');

//mock fetch
global.fetch = jest.fn();

jest.useFakeTimers();

describe('Metrics', () => {
  let intervalId;



  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    //lear all timers and intervals
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });











  describe('requestTracker', () => {
    it('should track HTTP requests by method and call next', () => {
      const req = { method: 'GET', path: '/test', user: null };
      const res = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
      };
      const next = jest.fn();

      metrics.requestTracker(req, res, next);





      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should track active users when user is authenticated', () => {
      const req = { method: 'POST', path: '/api/order', user: { id: 123 } };
      const res = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
      };
      const next = jest.fn();

      metrics.requestTracker(req, res, next);
      expect(next).toHaveBeenCalled();
    });






    it('should track endpoint latency on finish', () => {
      const req = { method: 'GET', path: '/test', user: null };
      const res = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
      };
      const next = jest.fn();

      metrics.requestTracker(req, res, next);
      res.on.mock.calls.find(call => call[0] === 'finish')[1]();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('trackAuthAttempt', () => {
    it('should track successful auth attempts', () => {
      expect(() => metrics.trackAuthAttempt(true)).not.toThrow();
    });

    it('should track failed auth attempts', () => {
      expect(() => metrics.trackAuthAttempt(false)).not.toThrow();
    });
  });










  describe('pizzaPurchase', () => {
    it('should track successful pizza purchase with revenue', () => {
      expect(() => metrics.pizzaPurchase(true, 100, 0.05)).not.toThrow();
    });

    it('should track failed pizza purchase', () => {
      expect(() => metrics.pizzaPurchase(false, 200, 0)).not.toThrow();
    });
  });













  describe('startMetricReporting and sendMetricsPeriodically', () => {
    it('should send metrics to Grafana when reporting starts', async () => {
      metrics.trackAuthAttempt(true);
      metrics.pizzaPurchase(true, 100, 0.05);

      intervalId = metrics.startMetricReporting(100);

      jest.advanceTimersByTime(100);
      await Promise.resolve();







      expect(global.fetch).toHaveBeenCalled();
    });











    it('should handle errors when sending metrics', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      metrics.trackAuthAttempt(true);
      intervalId = metrics.startMetricReporting(100);
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle non-ok response from Grafana', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      metrics.trackAuthAttempt(true);
      intervalId = metrics.startMetricReporting(100);
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should reset counters after sending metrics', async () => {
      metrics.trackAuthAttempt(true);
      metrics.pizzaPurchase(true, 100, 0.05);

      intervalId = metrics.startMetricReporting(100);
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });





    it('should handle missing config gracefully', async () => {
      const config = require('./config');
      const originalMetrics = config.metrics;
      config.metrics = null;

      intervalId = metrics.startMetricReporting(100);
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(global.fetch).not.toHaveBeenCalled();
      
      config.metrics = originalMetrics;
    });
  });




  
  describe('startMetricReporting', () => {
    it('should start periodic metric reporting with custom period', () => {
      expect(() => metrics.startMetricReporting(50)).not.toThrow();
    });

    it('should use default period if not provided', () => {
      expect(() => metrics.startMetricReporting()).not.toThrow();
    });
  });
});

