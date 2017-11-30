import Mailer from '../lib/mail'
import crypto from 'crypto'

export default function (Explorer) {

  Explorer.beforeRemote ('**', (context, instance, next) => {
    console.log(context.methodString)
    next()
  })

  Explorer.observe ('before save', (context, next) => {
    const now = Date.now();
    context.instance.updated = now
    if (context.isNewInstance) {
      context.instance.created = now
      crypto.randomBytes(64, (error, buf) => {
        if (!error && buf) {
          context.instance.verificationToken = buf.toString('hex')
          context.instance.verifiedEmail = false
          next()
        } else {
          next(new Error('something went wrong'))
        }
      });
    } else {
      next()
    }
  })

  Explorer.observe ('after save', (context, next) => {
    next()
    if (context.isNewInstance) {
      Mailer.send({
        recipientEmail: context.instance.email,
        token: context.instance.verificationToken,
        verificationUrl: `http:\/\/localhost:3001/api/Explorers/confirm?uid=${context.instance.id}&token=${context.instance.verificationToken}`
      })
      .then (res => {
        next()
      })
      .catch (error => {
        next(error)
      })
    }
  })

  Explorer.confirm = function (uid, token, redirect, next) {
    Explorer.findById(uid, (error, explorer ) => {
      if (!error && explorer) {
        const clearToken = token.trim()

        if (explorer.verificationToken === clearToken) {
          explorer.verifiedEmail = true
          explorer.verificationToken = null
          explorer.save( function (error, newExplorer) {
            if (!error) {
              next()
            } else {
              next(error) 
            }
          })
        } else {
          next(new Error('This token has been already used'))
        }
      } else {
        next(error)
      }
    })
  }

  Explorer.afterRemote ('confirm', (context, instance, next) => {
    context.result = {
      message: 'Email verified'
    }
    next()
  })

  Explorer.remoteMethod(
    'confirm',
    {
      description: 'Confirm a user registration with identity verification token.',
      accepts: [
        {arg: 'uid', type: 'string', required: true},
        {arg: 'token', type: 'string', required: true},
        {arg: 'redirect', type: 'string'},
      ],
      returns: {arg: 'data', type: 'object'},
      http: {verb: 'get', path: '/confirm'},
    }
  );
}
