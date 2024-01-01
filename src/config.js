/*
    Configuraciones basicas del servidor para la conexion
    con mongoDB
*/

import {config} from 'dotenv'
config();

export default{

    mongodbURL: process.env.MONGODb_URI || 'mongodb//localhost/defaultdb',
    Port_SERVER: process.env.PORT 

}