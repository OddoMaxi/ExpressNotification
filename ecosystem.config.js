module.exports = {
  apps: [{
    name: 'louba-backend',
    script: './backend/server.js',
    cwd: '/opt/louba',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/louba/error.log',
    out_file:   '/var/log/louba/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
