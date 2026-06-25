import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// Custom metrics
const dashboardLoadTime = new Trend('dashboard_load_time');
const customerSearchTime = new Trend('customer_search_time');
const invoiceCreateTime = new Trend('invoice_create_time');
const medicalRecordCreateTime = new Trend('medical_record_create_time');
const errorRate = new Rate('error_rate');
const successCount = new Counter('success_count');
const failureCount = new Counter('failure_count');

// Base URL for the application
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test configuration - scenarios for different concurrency levels
export const options = {
  scenarios: {
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      startTime: '0s',
      tags: { scenario: 'smoke' },
    },
    load_test_100: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '20s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      startTime: '30s',
      tags: { scenario: '100_concurrent' },
    },
    load_test_1000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 500 },
        { duration: '30s', target: 1000 },
        { duration: '15s', target: 0 },
      ],
      startTime: '70s',
      tags: { scenario: '1000_concurrent' },
    },
    load_test_10000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 5000 },
        { duration: '30s', target: 10000 },
        { duration: '20s', target: 0 },
      ],
      startTime: '130s',
      tags: { scenario: '10000_concurrent' },
    },
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '30s', target: 200 },
      ],
      startTime: '200s',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.05'],
    dashboard_load_time: ['p(95)<2000'],
    customer_search_time: ['p(95)<500'],
    invoice_create_time: ['p(95)<1000'],
    medical_record_create_time: ['p(95)<1000'],
    error_rate: ['rate<0.05'],
  },
};

// Test data generators
function generateCustomerData() {
  const id = Math.floor(Math.random() * 1000000);
  return {
    name: `Load Test Customer ${id}`,
    email: `loadtest${id}@example.com`,
    phone: `+1${String(id).padStart(10, '0').slice(0, 10)}`,
    address: `${id} Load Test Blvd, Test City, TC ${String(id).slice(0, 5)}`,
  };
}

function generatePetData(customerId) {
  const names = ['Max', 'Bella', 'Charlie', 'Luna', 'Cooper', 'Daisy', 'Rocky', 'Sadie', 'Milo', 'Coco'];
  const species = ['dog', 'cat', 'bird', 'rabbit', 'hamster'];
  const breeds = {
    dog: ['Labrador', 'Golden Retriever', 'German Shepherd', 'Bulldog', 'Poodle'],
    cat: ['Persian', 'Maine Coon', 'Siamese', 'Bengal', 'Sphynx'],
    bird: ['Cockatiel', 'Parakeet', 'African Grey', 'Canary', 'Finch'],
    rabbit: ['Holland Lop', 'Mini Rex', 'Netherland Dwarf', 'Flemish Giant', 'English Angora'],
    hamster: ['Syrian', 'Dwarf Campbell', 'Djungarian', 'Roborovski', 'Chinese'],
  };
  const speciesChoice = species[Math.floor(Math.random() * species.length)];
  const breedList = breeds[speciesChoice];
  return {
    name: names[Math.floor(Math.random() * names.length)],
    species: speciesChoice,
    breed: breedList[Math.floor(Math.random() * breedList.length)],
    age: Math.floor(Math.random() * 15) + 1,
    weight: Math.floor(Math.random() * 80) + 1,
    customerId: customerId,
  };
}

function generateMedicalRecordData(petId, vetId) {
  const diagnoses = [
    'Annual checkup - healthy',
    'Upper respiratory infection',
    'Skin allergy',
    'Dental cleaning needed',
    'Ear infection',
    'Vaccination booster',
    'Spay/neuter follow-up',
    'Arthritis management',
    'Diabetes monitoring',
    'Heartworm prevention',
  ];
  const treatments = [
    'Prescribed antibiotics',
    'Recommended dietary change',
    'Applied topical treatment',
    'Administered vaccination',
    'Performed dental cleaning',
    'Prescribed anti-inflammatory',
    'Recommended exercise regimen',
    'Prescribed insulin',
    'Administered heartworm medication',
    'Ear cleaning and medication',
  ];
  return {
    petId: petId,
    veterinarianId: vetId || 'doctor-001',
    diagnosis: diagnoses[Math.floor(Math.random() * diagnoses.length)],
    treatment: treatments[Math.floor(Math.random() * treatments.length)],
    notes: 'Load test generated medical record. Routine examination performed. Patient in stable condition.',
    date: new Date().toISOString().split('T')[0],
    followUpInDays: Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 7 : null,
  };
}

function generateInvoiceData(customerId, petId) {
  const services = [
    { description: 'Office Visit - Standard', quantity: 1, unitPrice: 75.00 },
    { description: 'Vaccination - DHPP', quantity: 1, unitPrice: 45.00 },
    { description: 'Heartworm Test', quantity: 1, unitPrice: 35.00 },
    { description: 'Fecal Examination', quantity: 1, unitPrice: 25.00 },
    { description: 'Dental Cleaning', quantity: 1, unitPrice: 200.00 },
    { description: 'Blood Work - Comprehensive', quantity: 1, unitPrice: 150.00 },
    { description: 'X-Ray - Single View', quantity: 1, unitPrice: 120.00 },
    { description: 'Urinalysis', quantity: 1, unitPrice: 30.00 },
    { description: 'Prescription - Antibiotics', quantity: 1, unitPrice: 25.00 },
    { description: 'Nail Trim', quantity: 1, unitPrice: 15.00 },
  ];
  const selectedServices = services.slice(0, Math.floor(Math.random() * 4) + 1);
  const subtotal = selectedServices.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
  const tax = subtotal * 0.08;
  return {
    customerId: customerId,
    petId: petId,
    items: selectedServices,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
    status: 'pending',
    paymentMethod: Math.random() > 0.5 ? 'credit_card' : 'cash',
  };
}

// Setup function - runs once per VU
export function setup() {
  console.log('Starting Haland PetCare load tests');
  console.log(`Base URL: ${BASE_URL}`);
  return { startTime: Date.now() };
}

// Main test function
export default function (data) {
  // Generate unique identifiers for this iteration
  const vuId = __VU;
  const iterId = __ITER;
  const requestId = `${vuId}-${iterId}-${Date.now()}`;

  // Group 1: Dashboard Load
  group('Dashboard Load', function () {
    const startTime = Date.now();
    const response = http.get(`${BASE_URL}/api/_health`, {
      tags: { name: 'dashboard_health', requestId },
      headers: {
        'X-Request-Id': requestId,
        'Cache-Control': 'no-cache',
      },
    });

    const duration = Date.now() - startTime;
    dashboardLoadTime.add(duration);

    const checkResult = check(response, {
      'dashboard health returns 200': (r) => r.status === 200,
      'dashboard response time < 2s': () => duration < 2000,
    });

    if (checkResult) {
      successCount.add(1);
    } else {
      failureCount.add(1);
      errorRate.add(1);
    }

    sleep(Math.random() * 2 + 1);
  });

  // Group 2: Customer Search
  group('Customer Search', function () {
    const searchTerms = ['John', 'Jane', 'Max', 'Luna', 'Smith', 'Doe', 'test', 'customer'];
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    const startTime = Date.now();
    const response = http.get(`${BASE_URL}/api/customers?search=${searchTerm}&limit=10`, {
      tags: { name: 'customer_search', requestId },
      headers: {
        'X-Request-Id': requestId,
        'Cache-Control': 'no-cache',
      },
    });

    const duration = Date.now() - startTime;
    customerSearchTime.add(duration);

    const checkResult = check(response, {
      'customer search returns 200': (r) => r.status === 200,
      'customer search response time < 500ms': () => duration < 500,
      'customer search returns valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
    });

    if (checkResult) {
      successCount.add(1);
    } else {
      failureCount.add(1);
      errorRate.add(1);
    }

    sleep(Math.random() * 1 + 0.5);
  });

  // Group 3: Create Invoice
  group('Create Invoice', function () {
    const customerData = generateCustomerData();
    const petData = generatePetData(0);
    const invoiceData = generateInvoiceData(0, 0);

    const startTime = Date.now();
    const response = http.post(`${BASE_URL}/api/invoices`, JSON.stringify(invoiceData), {
      tags: { name: 'create_invoice', requestId },
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
    });

    const duration = Date.now() - startTime;
    invoiceCreateTime.add(duration);

    const checkResult = check(response, {
      'invoice creation returns 200 or 201': (r) => r.status === 200 || r.status === 201,
      'invoice creation response time < 1s': () => duration < 1000,
      'invoice creation returns valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
    });

    if (checkResult) {
      successCount.add(1);
    } else {
      failureCount.add(1);
      errorRate.add(1);
    }

    sleep(Math.random() * 2 + 1);
  });

  // Group 4: Create Medical Record
  group('Create Medical Record', function () {
    const petId = Math.floor(Math.random() * 1000) + 1;
    const vetId = `doctor-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`;
    const medicalRecordData = generateMedicalRecordData(petId, vetId);

    const startTime = Date.now();
    const response = http.post(`${BASE_URL}/api/medical-records`, JSON.stringify(medicalRecordData), {
      tags: { name: 'create_medical_record', requestId },
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
    });

    const duration = Date.now() - startTime;
    medicalRecordCreateTime.add(duration);

    const checkResult = check(response, {
      'medical record creation returns 200 or 201': (r) => r.status === 200 || r.status === 201,
      'medical record creation response time < 1s': () => duration < 1000,
      'medical record creation returns valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
    });

    if (checkResult) {
      successCount.add(1);
    } else {
      failureCount.add(1);
      errorRate.add(1);
    }

    sleep(Math.random() * 2 + 1);
  });
}

// Teardown function
export function teardown(data) {
  const totalDuration = Date.now() - data.startTime;
  console.log(`Load tests completed in ${totalDuration}ms`);
  console.log('=== Test Summary ===');
  console.log(`Dashboard Load Time (p95): ${dashboardLoadTime.percentile(95)}ms`);
  console.log(`Customer Search Time (p95): ${customerSearchTime.percentile(95)}ms`);
  console.log(`Invoice Create Time (p95): ${invoiceCreateTime.percentile(95)}ms`);
  console.log(`Medical Record Create Time (p95): ${medicalRecordCreateTime.percentile(95)}ms`);
  console.log(`Error Rate: ${errorRate.rate * 100}%`);
  console.log(`Success Count: ${successCount.count}`);
  console.log(`Failure Count: ${failureCount.count}`);
}

// Handle summary output
export function handleSummary(data) {
  const reportPath = __ENV.REPORT_PATH || './reports';
  return {
    [`${reportPath}/summary.json`]: JSON.stringify(data, null, 2),
    [`${reportPath}/report.html`]: htmlReport(data, {
      title: 'Haland PetCare - Load Test Report',
      description: 'Comprehensive load testing results for Haland PetCare veterinary management system',
    }),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

// Text summary formatter
function textSummary(data, options) {
  const { indent = '  ', enableColors = true } = options || {};
  const colors = enableColors
    ? { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m' }
    : { green: '', red: '', yellow: '', cyan: '', reset: '' };

  let output = '\n';
  output += `${colors.cyan}========================================${colors.reset}\n`;
  output += `${colors.cyan}  Haland PetCare - Load Test Results${colors.reset}\n`;
  output += `${colors.cyan}========================================${colors.reset}\n\n`;

  // Test info
  output += `${indent}Test Timestamp: ${new Date().toISOString()}\n`;
  output += `${indent}Base URL: ${BASE_URL}\n\n`;

  // Metrics
  output += `${colors.yellow}--- Performance Metrics ---${colors.reset}\n`;
  output += `${indent}Dashboard Load Time (p95): ${formatDuration(dashboardLoadTime.percentile(95), colors)}\n`;
  output += `${indent}Customer Search Time (p95): ${formatDuration(customerSearchTime.percentile(95), colors)}\n`;
  output += `${indent}Invoice Create Time (p95): ${formatDuration(invoiceCreateTime.percentile(95), colors)}\n`;
  output += `${indent}Medical Record Create Time (p95): ${formatDuration(medicalRecordCreateTime.percentile(95), colors)}\n\n`;

  // HTTP metrics
  output += `${colors.yellow}--- HTTP Metrics ---${colors.reset}\n`;
  output += `${indent}HTTP Request Duration (p95): ${formatDuration(data.metrics?.http_req_duration?.values?.['p(95)'] || 0, colors)}\n`;
  output += `${indent}HTTP Request Failed: ${(data.metrics?.http_req_failed?.values?.rate || 0 * 100).toFixed(2)}%\n\n`;

  // Error rate
  output += `${colors.yellow}--- Error Metrics ---${colors.reset}\n`;
  const errRate = errorRate.rate * 100;
  const errColor = errRate > 5 ? colors.red : colors.green;
  output += `${indent}Error Rate: ${errColor}${errRate.toFixed(2)}%${colors.reset}\n`;
  output += `${indent}Success Count: ${colors.green}${successCount.count}${colors.reset}\n`;
  output += `${indent}Failure Count: ${failureCount.count > 0 ? colors.red : colors.green}${failureCount.count}${colors.reset}\n\n`;

  // Threshold check
  output += `${colors.yellow}--- Threshold Check ---${colors.reset}\n`;
  const thresholds = data.metrics?.http_req_duration?.thresholds || {};
  for (const [key, value] of Object.entries(thresholds)) {
    const status = value.ok ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
    output += `${indent}${key}: ${status}\n`;
  }

  output += `\n${colors.cyan}========================================${colors.reset}\n`;
  output += `${colors.cyan}  Report saved to ${reportPath}/report.html${colors.reset}\n`;
  output += `${colors.cyan}========================================${colors.reset}\n`;

  return output;
}

function formatDuration(ms, colors) {
  if (ms === undefined || ms === null) return `${colors.red}N/A${colors.reset}`;
  const color = ms < 1000 ? colors.green : ms < 3000 ? colors.yellow : colors.red;
  return `${color}${ms.toFixed(2)}ms${colors.reset}`;
}
