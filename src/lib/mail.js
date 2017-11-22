import nodemailer from 'nodemailer'

const { 
  SERVER_URL,
  MAILER_HOST,
  MAILER_PORT,
  MAILER_AUTH_USER,
  MAILER_AUTH_PASS,
  MAILER_AUTH_DISPLAYNAME,
} = process.env

class Mailer {
  constructor () {
    this.transporter = nodemailer.createTransport({
        host: MAILER_HOST,
        port: parseInt(MAILER_PORT),
        secure: true,
        auth: {
            user: MAILER_AUTH_USER,
            pass: MAILER_AUTH_PASS
        },
        tls: {
            ciphers:'SSLv3'
        }
    })
  }

  send ({recipientEmail, token, subject, message, verificationUrl}) {
    return new Promise ( (resolve, reject) => {
      this.transporter.verify((error, success) => {
        if (error) {
          reject(error);
        } else {
          const email = {
            from: MAILER_AUTH_USER,
            to: `${recipientEmail}, ${MAILER_AUTH_USER}`, 
            subject: subject || ` ✔ Confirm your email to access in Kuntur Project`,
            html: message ||  `<b>: Confirm you email, here: </b><a href="${verificationUrl}" target="_blank" > Click here</a>`
          };
          this.transporter.sendMail(email, (error, info) => {
            if (!error) {
              resolve(email);
            } else {
              reject(error)
            }
          })
        }
      })
    })
  }
}

const MailerInst = new Mailer();
export default MailerInst;
