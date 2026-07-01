import net from "node:net";

export function escposText(lines: string[]): Buffer {
  const ESC = 0x1b;
  const GS = 0x1d;
  const init = Buffer.from([ESC, 0x40]);
  const alignCenter = Buffer.from([ESC, 0x61, 1]);
  const alignLeft = Buffer.from([ESC, 0x61, 0]);
  const boldOn = Buffer.from([ESC, 0x45, 1]);
  const boldOff = Buffer.from([ESC, 0x45, 0]);
  const cut = Buffer.from([GS, 0x56, 0x00]);
  const lf = Buffer.from("\n", "ascii");

  const chunks: Buffer[] = [init, alignCenter, boldOn];
  for (const line of lines) {
    chunks.push(Buffer.from(line, "utf8"), lf);
  }
  chunks.push(boldOff, alignLeft, lf, lf, cut);
  return Buffer.concat(chunks);
}

export function sendEscPosTcp(host: string, port: number, data: Buffer, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };
    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => done(new Error(`Timeout stampante ${host}:${port}`)));
    socket.on("error", (err) => done(err));
    socket.connect(port, host, () => {
      socket.write(data, (err) => {
        if (err) return done(err);
        socket.end();
        done();
      });
    });
  });
}
