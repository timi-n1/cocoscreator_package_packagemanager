Editor.Panel.extend({
    style: `
        :host {
            padding: 4px;
            display: flex;
            flex-direction: column;
        }
        .box{
            display: flex;
        }
        span.btn{
            width: 60px;
        }
        span.msg{
            line-height: 20px;
            vertical-align: super;
            font-size: 14px;
            display: inline-block;
            flex: 1;
        }
        input{
            
        }
        .loading{
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0px;
            left: 0px;
            background-color: rgba(0,0,0,0.5);
            font-size: 30px;
            color: #FFFFFF;
            text-align: center;
            line-height: 500px;
        }
    `,
    template: `
        <ui-box-container>
            <div class="box" v-for="(index,package) in packageList" track-by="$index">
                <span class="msg" @click="alert(package.desc)">{{index+1}}. {{package.name}} | 本地{{package.localVersion}} | 远程{{package.version}}</span>
                <span class="btn"><ui-button v-if="!package.localExists" @click="download(index)" class="green small">下载</ui-button></span>
                <span class="btn"><ui-button v-if="_needUpdate(package)" @click="update(index)" class="green small">更新</ui-button></span>
                <span class="btn"><ui-button v-if="package.localExists" @click="remove(index)" class="red small">移除</ui-button></span>
            </div>
        </ui-box-container>
        <div style="margin-top: 4px;">
            <ui-button class="cbtn green" @click="checkAllUpdate">刷新列表</ui-button>
        </div>
        <div v-show="checking" class="loading">Loading...</div>
    `,

    ready() {

        const request = require('request');
        const async = require('async');
        const fs = require('fs-extra');
        const spawn = require("child_process").spawn;
        const path = require('path');
        const proxy = 'http://web-proxy.oa.com:8080';
        const requestConfig = {
            'proxy': proxy,
            'cache-control': 'no-cache'
        };

        new window.Vue({
            el: this.shadowRoot,
            data: {
                packageList: [],
                checking: false
            },
            created() {
                this.checkAllUpdate();
            },
            computed: {

            },
            methods: {
                checkAllUpdate() {
                    if (this.checking) {
                        return;
                    }
                    this.checking = true;
                    this._get('https://raw.githubusercontent.com/timi-n1/cocoscreator_package_packagemanager/master/packages_list.json', (body) => {
                        const list = JSON.parse(body);
                        console.table(list);
                        this._parsePackageList(list);
                    });
                },
                download(index) {
                    this.checking = true;
                    const package = this.packageList[index];
                    const git = spawn('git', ['clone', `https://github.com/${package.gitname}.git`, this._getLocalPath(package)]);
                    git.on('close', (code) => {
                        this._refreshPackage(index, ()=>{
                            this.checking = false;
                        });
                        console.log(`child process exited with code ${code}`);
                    });
                },
                remove(index){
                    const package = this.packageList[index];
                    fs.removeSync(this._getLocalPath(package));
                    package.localExists = false;
                    package.localVersion = '空';
                },
                update(index){
                    const package = this.packageList[index];
                    fs.removeSync(this._getLocalPath(package));
                    this.download(index);
                },
                alert(msg){
                    window.alert(msg);
                },
                _get(url, done) {
                    request(url, requestConfig, (error, response, body) => {
                        if (!error && response && response.statusCode == 200) {
                            done && done(body);
                        }
                        else{
                            done && done(null);
                        }
                    });
                },
                _checkPrivate(package, done){
                    if( package.isPrivate ){

                    }
                },
                _parsePackageList(list) {
                    //https://raw.githubusercontent.com/timi-n1/cocoscreator_package_atlasmanager/master/package.json
                    async.eachOfSeries(list, (package, index, cb) => {
                        const local = this._getLocalVersionFilePath(package);
                        if (fs.existsSync(local)) {
                            package.localExists = true;
                            package.localVersion = JSON.parse(fs.readFileSync(local).toString()).version;
                        }
                        else {
                            package.localExists = false;
                            package.localVersion = '空';
                        }
                        //remote
                        this._get(this._getRemoteVersionFilePath(package), (body) => {
                            try{
                                package.version = JSON.parse(body).version;
                            }
                            catch(err){}
                            cb();
                        });
                    }, () => {
                        this.packageList = list;
                        this.checking = false;
                    });
                },
                _refreshPackage(index, done){
                    const package = this.packageList[index];
                    const local = this._getLocalVersionFilePath(package);
                    if (fs.existsSync(local)) {
                        package.localExists = true;
                        package.localVersion = JSON.parse(fs.readFileSync(local).toString()).version;
                    }
                    else {
                        package.localExists = false;
                        package.localVersion = '空';
                    }
                    //remote
                    this._get(this._getRemoteVersionFilePath(package), (body) => {
                        package.version = JSON.parse(body).version;
                        done && done();
                    });
                },
                _needUpdate(package) {
                    return package.localExists && package.localVersion != package.version;
                },
                _getLocalPath(package){
                    return path.resolve(Editor.projectInfo.path, `./packages/${package.path}`);
                },
                _getLocalVersionFilePath(package) {
                    return path.resolve(Editor.projectInfo.path, `./packages/${package.path}/package.json`);
                },
                _getRemoteVersionFilePath(package) {
                    return `https://raw.githubusercontent.com/${package.gitname}/master/package.json`;
                }
            }
        });
    },
});