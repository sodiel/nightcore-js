import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'path';
import {exec} from 'child_process';
import {pathToFileURL} from "node:url";
const app: Express = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('tracks'));

app.post('/', (req: Request, res: Response) => {
    let filename: string = '';
    let trackQuery = req.body.trackQuery;
    exec(`./yt-dlp "ytsearch:${trackQuery}" -x --audio-format mp3 -P ./tracks --print after_move:filepath`, (err, stdout, stderr) => {
        filename = stdout;
        let cleanPath = stdout.trim();
        let filenameOnly = path.basename(cleanPath.replace(/^\.\/tracks\//, ''));
        console.log(filenameOnly);

        if (err) {
            throw new Error(`Response: ${stderr}`);
        }

    res.send(`http://localhost:${port}/${encodeURIComponent(filenameOnly)}`)
    });

});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});