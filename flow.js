
module.exports = [
  {
    id: 'test',
    params: {
      title: 'test',
    },
    connections: [
      {
        id: 'crm',
        type: 'crm',
        crm: 'custom',
        params: {
          url: 'http://localhost:3000/api',
          auth: 'key',
          key: '3285094054305',
        },
      },
      {
        id: 'email-yandex',
        type: 'email',
        params: {
          name: 'test@test.ru',
          password: '1234',
        }
      }
    ],
    steps: [
      {
        id: 'start',
        type: 'validate',
        process: (data) => {
          return new Promise((resolve, reject) => {
            resolve(data);
          });
        },
        next: {
          default: 2,
        },
      },
      {
        id: 2,
        type: 'httprequest',
        connectionId: 'crm',
        params: {
          validate: true,
        },
        next: [
          {
            status: 'success',
            stepId: 4,
          },
          {
            status: 'fail',
            stepId: 3,
          }
        ],
      },
      {
        id: 3,
        type: 'email',
        connectionId: 'email-yandex',
        params: {
          to: 'vasya@test.ru',
        }
      },
      {
        id: 4,
        type: 'log',         
      },
    ],
  },
]