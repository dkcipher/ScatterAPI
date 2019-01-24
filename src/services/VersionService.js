import "isomorphic-fetch"
import config from '../util/config'

// Once every 12 hours.
const intervalTime = 60000 * 60 * 12;
let interval;
let bucket;
const bucketKey = 'version';
const url = 'https://api.github.com/repos/GetScatter/ScatterDesktop/releases/latest';


// Saving last prices in RAM, to alleviate DB calls.
// Mimics eventually persistent behavior.
let inRam;

export default class VersionService {

    static setBucket(_b){
        bucket = _b;
    }

    static async getVersion(){
        if(!inRam) inRam = (await bucket.get(bucketKey)).value;
        return inRam;
    }

    static async watch(){
        clearInterval(interval);
        return new Promise(async resolve => {

            const set = async () => {
                if(!bucket) return;

                const explorers = await VersionService.get();
                if(explorers) {
                    await bucket.upsert(bucketKey, explorers);
                    inRam = explorers;
                }

                resolve(true);
            };

            await set();
            interval = setInterval(async () => {
                await set();
            }, intervalTime);
        })
    }

    static get(){
        return Promise.race([
            new Promise(resolve => setTimeout(() => resolve(false), 2500)),
            fetch(url+`?rand=${Math.random() * 10000 + 1}`, {
                json: true,
                gzip: true
            }).then(x => x.json()).then(res => {
                if(res.prerelease) return null;

                const getAsset = needle => res.assets.find(x => x.name.indexOf(needle) > -1) || {url:'#'};

                return {
                    version:res.tag_name,
                    mac:getAsset('mac-').url,
                    win:getAsset('win-').url,
                    linux:getAsset('linux-').url,
                    details:res.body,
                }
            }).catch(err => {
                console.error(err);
                return null;
            })
        ])
    }

}