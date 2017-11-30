export default function (Record) {
  Record.beforeRemote ('**', (context, instance, next) => {
    console.log(context.methodString)
    next()
  })

  Record.observe ('before save', (context, next) => {
    const now = Date.now();
    if (context.isNewInstance) {
      const { accessToken } = context.options
      context.instance.created = now
      context.instance.updated = now
      context.instance.explorerId = accessToken.explorerId
    } else {
      delete context.data.id
      context.data.updated = now
    }
    next()
  })

  Record.remoteMethod ('uploadMedia', {
    "description": "Uploads media files for a Record",
    accepts: [
      { arg: "id", type: "string", required: true},
      { arg: 'context', type: "object", http: {source:"context"} },
      { arg: 'options', type: "object", http: {source:"query"} }
    ],
    returns: {
      arg: "MediaFile", type: "object", root: true
    },
    http: {path: '/:id/uploadMedia',verb: "post"}
  });

  Record.uploadMedia = function (id, context, options, cb) {
    Record.exists(id, function (error, exists) {
      if (!error && exists) {
        var MediaFile = Record.app.models.MediaFile;
        MediaFile.upload(context, {mediableId: id, mediableType: 'Record'}, function (error, resFile) {
          if (!error) {
            cb(null, resFile);
          } else {
            cb(error);
          }
        });
      } else {
        cb(error);
      }
    })
  };
}
