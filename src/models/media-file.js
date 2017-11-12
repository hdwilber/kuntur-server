'use strict';
import * as fs from 'fs';
import * as path from 'path';

import * as _gm from 'gm';
const gm = _gm.subClass({imageMagick: true});

import { Magic } from 'mmmagic';
import { ExifImage } from 'exif';
import geolib from 'geolib';

const LOCAL_STORAGE_ROOT = './storage';
const LOCAL_STORAGE_PREFIX = 'F';
const LOCAL_STORAGE_CONTAINER_USER = 'F';

const async = require ("async");

export default function (MediaFile) {
  MediaFile.observe('before save', (ctx, next) => {
    const now = new Date()
    if (ctx.isNewInstance) {
      ctx.instance.created = now
      ctx.instance.updated = now
    } else {
      ctx.data.updated = now
    }
    next();
  });


  function _saveMediaFile(data) {
    return new Promise ((resolve, reject) => {
      MediaFile.create ({
        ...data, 
        filename: data.filename,
        type: data.type,
        format: data.format,
        mediableId: data.mediableId,
        mediableType: data.mediableType,
        explorerId: data.explorerId,
        container: data.folder,
        lat: (data.metadata.lat) ? data.metadata.lat: -1,
        lng: (data.metadata.lng) ? data.metadata.lng: -1,
        path: data.fullPath, 
        url: "/Containers/"+data.containerPath+"/download/" + data.filename,
      }, (error, inst) => {
        if (!error) {
          resolve(inst)
        } else {
          reject(error)
        }
      })
    })
  }

  function checkExif(exifData) {
    var metadata = {};
    console.log("CHECKING EXIF DATA")
    console.log(exifData)
    console.log("CHECKING END EXIF DATA")
    const gps = exifData.gps;
    if (gps) {
      if (gps.GPSLatitude || gps.GPSLongitude ) {
        const lat = gps.GPSLatitude
        const latRef = gps.GPSLatitudeRef
        const lng  = gps.GPSLongitude
        const lngRef = gps.GPSLongitudeRef

        let auxLat = `${lat[0]}° ${lat[1]}' ${lat[2]}" ${latRef ? latRef: 'N'}`
        let auxLng = `${lng[0]}° ${lng[1]}' ${lng[2]}" ${lngRef ? lngRef: 'E'}`

        metadata.lat = geolib.sexagesimal2decimal(auxLat);
        metadata.lng = geolib.sexagesimal2decimal(auxLng);
      } 
    } else {
      console.log("Sin GPS")
    }
    return metadata
  }

  function parseExif(path) {
    return new Promise ((resolve, reject) => {
      new ExifImage({image: path}, (error, exifData) => {
        if (!error) {
          try {
            resolve(checkExif(exifData))
          } catch(error) {
            console.log(error)
            resolve ({})
          }
        } else {
          console.log('No hay exif')
          resolve({})
        }
      })
    })
  }
  function readFile (data) {
    return new Promise( (resolve, reject) => {
      const file = data.file;
      const folder = path.join (LOCAL_STORAGE_ROOT, data.containerPath);
      const fullPath = path.join (folder, file.name);
      gm(fullPath).format ((error, format) => {
        if (!error) {
          // Checking Exif 
          parseExif (fullPath)
          .then (metadata => {
            _saveMediaFile({
              format : format,
              filename: file.name,
              metadata: metadata,
              fullPath: fullPath,
              containerPath: data.containerPath,
              folder: folder,
              type: file.type,
              mediableType: data.mediableType,
              mediableId: data.mediableId,
              explorerId: data.explorerId
            })
            .then (res => {
              resolve(res)
            })
            .catch( error => reject(res))
          })
          .catch(error => {
            reject(error)
          })
        } else {
          // Error GM
          reject (new Error('Error in GM'))
        }
      });
    })
  }

  function _doUpload(context, options) {
    return new Promise ( (resolve, reject) => {
      const Container = MediaFile.app.models.Container;

      Container.upload (context.req, context.res, (error, body) => {
        if (!error) {
          if (body.files.mediaFiles) {
            const filesReading = body.files.mediaFiles.map (f => {
              return readFile ({
                containerPath: options.containerPath,
                file: f,
                mediableId: options.mediableId,
                mediableType: options.mediableType,
                explorerId: context.req.accessToken.explorerId.toString()
              })
            })
            Promise.all (filesReading)
            .then (res => {
              resolve(res)
            })
            .catch (error  => reject(error))

          } else {
            reject(new Error('Field thefiles is empty'))
          }
        } else {
          reject(new Error('Do upload failed'))
        }
      })
    })
  }

  MediaFile.upload = (context, options, cb) => {
    const Container = MediaFile.app.models.Container;
    const { accessToken } = context.req
    const folder = `${LOCAL_STORAGE_CONTAINER_USER}${accessToken.explorerId}`
    
    context.req.params.container = folder;
    options.containerPath = folder;

    Container.getContainer (folder, (error, container) => { 
      if (!error) {
        _doUpload(context, options)
        .then(files  => {
          console.log(files)
          cb (null, files)
        })
        .catch (error => {
          cb (error)
        })
      } else {
        Container.createContainer ({ name: folder }, (error, container) => {
          if (!error) {
            _doUpload(context, options)
            .then(files  => {
              cb(null, files)
            })
            .catch (error => {
              cb(null, error)
            })
          } else {
            cb(null, error);
          }
        });
      }
    });
  };

  MediaFile.remoteMethod("url", {
    "description": "Get URL for a mediafile",
    accepts: [
      { arg: 'context', type: 'object', http: { source:'context' } },
      { arg: 'filename', type: 'object', http:{ source: 'query'} }
    ],
    returns: {
      arg: "url", type: "string", root: true
    },
    http: {verb: "get"}
  });

  MediaFile.download = function (id,context, cb) {
    MediaFile.findOne({where: {id: id}}, function (error, res) {
      const Container = MediaFile.app.models.Container;
      if (!error) {
        cb(null, {download: "/Containers/"+ res.container+"/download/"+res.filename});
      } else {
        cb(null, {download: ""});
      }
    }); 
  }
};

