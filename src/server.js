'use strict';
import { PassportConfigurator } from 'loopback-component-passport';
import loopback from 'loopback';
import lboot from 'loopback-boot';
import lexplorer from 'loopback-component-explorer';

import * as bodyParser from 'body-parser';
const cookieParser = require('cookie-parser');
const passport = require('passport');

import dataSources from './config/datasources'

const { NODE_ENV } = process.env

export class Server {
  constructor() {
    this.app = loopback()
    this.configure();
  }
  start() {
    this.app.listen (() => {
      var baseUrl = this.app.get('url').replace(/\/$/, '');

      if ( NODE_ENV === 'development' )
        lexplorer(this.app, { basePath: '/api'});

      console.log('Browse your REST API at %s', baseUrl);
    });
  }
  configure() {
    const rootFolder = NODE_ENV === 'development' ? 'src' : 'build'
    lboot(this.app, {
      appRootDir: rootFolder,
      appConfigRootDir: `${rootFolder}/config`, 
      componentRootDir: `${rootFolder}/config`, 
      middlewareRootDir: `${rootFolder}/middleware`, 
      dataSources: dataSources,
    }, err => {
      if (err) throw err;
      this.start();
    });

    this.app.middleware('parse', bodyParser.json());
    this.app.middleware('parse', bodyParser.urlencoded({
      extended: true,
    }));
  }
}

