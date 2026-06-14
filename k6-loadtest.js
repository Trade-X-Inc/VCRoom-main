import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp up to 100 users
    { duration: '3m', target: 500 },   // ramp up to 500 users
    { duration: '3m', target: 1000 },  // ramp up to 1000 users
    { duration: '2m', target: 1000 },  // hold at 1000 users
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],     // less than 5% error rate
    errors: ['rate<0.05'],
  },
};

const BASE_URL = 'https://hockystick.app';

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/`, null, { tags: { name: 'landing' } }],
    ['GET', `${BASE_URL}/sign-in`, null, { tags: { name: 'signin' } }],
    ['GET', `${BASE_URL}/sign-up`, null, { tags: { name: 'signup' } }],
  ]);

  responses.forEach(res => {
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(res.status !== 200);
  });

  sleep(1);
}
