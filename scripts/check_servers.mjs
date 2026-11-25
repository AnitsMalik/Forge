import net from 'net';

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function test() {
  console.log('MySQL 3308:', await checkPort(3308));
  console.log('API 4000:', await checkPort(4000));
  console.log('Web 5173:', await checkPort(5173));
}
test();
