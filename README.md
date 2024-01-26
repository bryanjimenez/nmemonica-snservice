# @nmemonica/snservice

>Local development service for the app's UI ([Nmemonica](https://github.com/bryanjimenez/nmemonica)).

>Note: Nmemonica is a PWA and uses the Service Worker API [(MDN docs)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) which is only enabled over HTTPS.


This repo contains the service's source code for Nmemonica, basic service usage instructions and CSV dataset schema.


## Install and Start
### *Prerequisites*
- A server (Device running this service) with
  - [Git](https://git-scm.com/)
  - [Node](https://nodejs.org)
- A client (Device with browser viewing Nmemonica)
  - Internet access
  - Network access to the server

This package will be installed as a dependency, but can be installed independently:
```bash
# clone repo
git clone https://github.com/bryanjimenez/snservice.git
cd snservice
# install dependencies
npm install
# build service
npm run build

# generate certificates (additional instructions below)
node ./node_modules/@nmemonica/utils

# run service
node ./dist
```

or as a dependency the service can be ran:
```bash
# after being installed as a dependency
node ./node_modules/@nmemonica/snservice
```


## Configuration

Configurations will be set from `snservice.conf.json` which should be located at the project's root directory.

```js
// example
// snservice.conf.json
{
  ui: {
    origin: "https://bryanjimenez.github.io",
    port: 8080
  },

  service: {
    address: "127.0.0.1",
    hostname: "nmemonica.local",
    port: 8443
  },

  directory: {
    ca: "app/https/selfSignedCA",
    pushAPI: "app/https/pushAPI",
    csv: "app/data/csv",
    json: "app/data/json",
    audio: "app/audio"
  };
}
```


## Certificates
>To run this service over HTTPS a self signed CA must be installed on the client device.  
To authenticate the client on the server (mTLS) a client key+cert (pkcs12) must be installed on the client device.

Instructions and tools to create required certificates can be found 
on the [Generating Certificates](https://github.com/bryanjimenez/nmemonica-utils/blob/main/README.md#generating-certfificates) section of @nmemonica/utils. Alternatively any appropritate tool can be used instead.


## App configuration
To configure the app to use the local development service,
navigate to the **External Data Source** section in the Nmemonica App Settings: 
1. Enter `service_ip`:`https_port`  
   *Configures app to use local service*
1. Browser will prompt a client certificate selection
1. Select your certificate and click ALLOW or OK

The app's requests will be logged on the service. Red colored entries will indicate missing autentication/misconfigurations and other detected problems. 


## Datasets

User datasets (`Phrases.csv`, `Vocabulary.csv`, `Kanji.csv`) are kept in the `./app/data/csv` directory.

Datasets can be imported using the **External Data Source** section's import option in Nmemonica's App Settings.


### CSV files

CSV files require the headers noted below and are expected to be named accordingly (case sensitive).

>Note: CSV data needs to be exported as UTF-8

`Phrases.csv`
| Header   | Description            | Example     |
| -------- | ---------------------- | ----------- |
| Japanese | Japanese term          | こんにちわ  |
| Romaji   | Romaji pronunciation   | kon'nichiwa |
| English  | English translation    | Hello       |
| Literal  | Literal translation    | Hello       |
| Group    |                        |
| SubGroup |                        |
| Lesson   | Lesson info (metadata) |
| Tags     |                        | Greetings   |

`Vocabulary.csv`
| Header        | Description             | Example        |
| ------------- | ----------------------- | -------------- |
| Japanese      |                         | のんげん\n人間 |
| English       |                         | human          |
| Group         |                         | Noun           |
| Romaji        |                         | ningen         |
| SubGroup      |                         | Person         |
| Pronunciation | pronunciation overrride |                |
| Tags          |                         |                |
| Opposites     | uid of opposite word    |                |

`Kanji.csv`
| Header  | Description           | Example |
| ------- | --------------------- | ------- |
| Kanji   |                       | 六      |
| English |                       | six     |
| Onyomi  |                       |
| Kunyomi |                       |
| Group   |                       | Numbers |
| Tags    |                       | Numbers |
| Radex   | radical example kanji |


## API Docs

Service API is documented using [SwaggerUI](https://swagger.io/docs/specification/basic-structure/) and [OpenAPI](https://github.com/OAI/OpenAPI-Specification/blob/3.0.1/versions/3.0.1.md)

The API documentation link will appear upon running the service. The default address is `https://localhost:8443/api-docs`.