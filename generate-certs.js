const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('Generating self-signed certificates for localhost...\n');

// Try using OpenSSL (comes with Git for Windows)
try {
  // Generate private key
  execSync(`openssl genrsa -out "${path.join(certsDir, 'localhost-key.pem')}" 2048`, {
    stdio: 'inherit'
  });

  // Generate certificate signing request
  execSync(`openssl req -new -key "${path.join(certsDir, 'localhost-key.pem')}" -out "${path.join(certsDir, 'localhost.csr')}" -subj "/C=BR/ST=GO/L=Goiania/O=GrupReis/CN=localhost"`, {
    stdio: 'inherit'
  });

  // Generate self-signed certificate
  execSync(`openssl x509 -req -days 365 -in "${path.join(certsDir, 'localhost.csr')}" -signkey "${path.join(certsDir, 'localhost-key.pem')}" -out "${path.join(certsDir, 'localhost.pem')}"`, {
    stdio: 'inherit'
  });

  // Clean up CSR file
  fs.unlinkSync(path.join(certsDir, 'localhost.csr'));

  console.log('\n✅ Certificates generated successfully!');
  console.log(`   📁 Location: ${certsDir}`);
  console.log('   📄 Certificate: localhost.pem');
  console.log('   🔑 Private Key: localhost-key.pem\n');
  console.log('⚠️  Note: These are self-signed certificates for development only.');
  console.log('   Your browser will show a security warning - this is normal.\n');
} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  console.log('\n💡 Make sure OpenSSL is installed on your system.');
  console.log('   It usually comes with Git for Windows.');
  process.exit(1);
}

