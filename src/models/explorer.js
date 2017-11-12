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
    }
    next()
  })

}
