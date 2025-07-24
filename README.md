# TV Time to Trakt Movies

This scripts converts the movies watched on TV Time to Trakt.

## Prerequisites

- Node.js
- npm

Visit the [Node documentation](https://nodejs.org/en/download) for more info on how to install Node.js and npm.

## Environment variables

Open [Trakt](https://trakt.tv/oauth/applications) and create a new *API*. Then insert in the `.env` file in the root directory of the project the following variables:

- `TRAKT_CLIENT_ID`
- `TRAKT_CLIENT_SECRET`

## Usage

First of all you need to add your Trakt API credentials to the `.env` file (see [Environment variables](#environment-variables)).

Run the following command to install the dependencies:

```bash
npm install
```

Convert the file `tracking-prod-records.csv` from your Tv Time GDPR export to a JSON file (you can use [this site](https://csvjson.com/csv2json), make sure to check "Parse numbers" and "Output: Array" and use "Comma" as separator). The JSON file should be named `tracking-prod-records.json` and should be placed in the root directory of the project.

Run the script:

```bash
node convert.js
```

You have to authenticate into your Trakt account: open the prompted link and insert the auth code shown in the console.

The script will try to convert the movies watched on TV Time to Trakt format, ready for import. Every entry that needs user attention will be saved in the `needAttention.json` file. If this file is not empty, run the following script and select manually the alternatives:

```bash
node attentioning.js
```

## Upload

To upload the movies to Trakt go to the [import page](https://trakt.tv/welcome/7) and select "JSON File". Here you can upload the files:

- `movies_listed.json`
- `movies_watched.json`
- `attentioned_listed.json`
- `attentioned_watched.json`
