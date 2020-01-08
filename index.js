const core = require('@actions/core');
const aws = require('aws-sdk');
const fs = require('fs');
const glob = require('glob');
const mime = require('mime-types');


const S3 = new aws.S3();

function uploadFiles(paramsDefault, localPath) {


  //check if local path exists
  if (!fs.existsSync(localPath)) {
    throw new Error(`Folder ${localPath} does not exists`);
  } else {
    core.debug('folder exists');
  }

  glob(`${localPath}/**/*`, (err, files) => {
    let pattern = new RegExp(localPath + '/');
    core.debug('uploading ', files.length, ' files');
    files.forEach(file => {
      if (fs.lstatSync(file).isFile()) {

        S3.upload({
          ...paramsDefault,
          Key: file.replace(pattern, ''),
          Body: fs.readFileSync(file),
          ContentType: mime.lookup(file)
        }, (err, data) => {
          if (err) {
            throw err;
          } else {
            core.debug("file uploaded ", file);
          }
        })
      }

    })
  })
}

async function run() {
  try {

    const bucketName = core.getInput('aws-s3-bucket-name', { required: true });
    const localPath = core.getInput('local-path', { required: true });




    const paramsDefault = {
      Bucket: bucketName
    }

    //list all objects in the bucket
    S3.listObjects({ ...paramsDefault }, (err, data) => {
      if (err) {
        throw err;
      } else {
        let listOfObjects = data.Contents.map(object => ({ Key: object.Key }));
        core.debug(`deleting ${listOfObjects.length} files from the bucket`);
        if (listOfObjects.length) {
          S3.deleteObjects({
            ...paramsDefault,
            Delete: {
              Objects: listOfObjects
            }
          }, (err, data) => {
            if (err) {
              throw err;
            } else {
              uploadFiles(paramsDefault, localPath);
            }
          })
        } else {
          uploadFiles(paramsDefault, localPath);
        }
      }
    });

  } catch (error) {
    core.debug(`${error.code}: ${error.message}`);
    core.setFailed(error.message);
  }
}

module.exports = run;

run();