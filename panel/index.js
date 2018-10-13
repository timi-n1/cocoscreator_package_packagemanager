Editor.Panel.extend({
    style: `
        :host {
            padding: 4px;
            display: flex;
            flex-direction: column;
        }
        .typebox{
            margin: 4px;
        }
        .typebox .box{
            display: inline-block;
            margin: 0 0 0 2px;
        }
        .typebox .active{
            color: #38b5d4;
            font-weight: bold;
            
        }
        .idlist{
            overflow-y: scroll;
        }
        .idlist .box{
            display: flex;
            margin: 1px 0;
            s
        }
        .idlist .box .order{
            margin: 0;
            width: 35px;
            font-size: 14px;
            display: inline-block;
            text-align: center;
            line-height: 30px;
        }
        .input{
            background: transparent;
            padding: 4px 8px;
            font-size: 14px;
            flex: 1;
            border: 1px solid gray;
            border-radius: 5px;
            color: white;
        }
        .cbtn{
            width:90px;
        }
    `,
    template: `
        <div class="typebox">
            <ui-button class="box" :class="{active:type==typeActive}" v-for="(type,item) in eventMap" @click="typeActive=type">{{type}}</ui-button>
        </div>
        <ui-box-container>
            <div class="idlist">
                <div class="box" v-for="(index,id) in eventMap[typeActive]" track-by="$index">
                    <p class="order">{{index+1}}</p>
                    <input class="input" v-model="id" placeholder="请输入事件id名称"></input>
                    <ui-button style="margin: 2px 0 0 4px;" @click="deleteId(index)" class="red">删除</ui-button>
                </div>
            </div>
        </ui-box-container>
        <div style="margin-top: 4px;">
            <ui-button class="cbtn green" @click="checkAllUpdate">检查更新</ui-button>
            <ui-button class="cbtn" @click="addId">增加id</ui-button>
            <ui-button class="cbtn red" @click="delType">删除type</ui-button>
            <ui-button class="cbtn" @click="addType">增加type</ui-button>
            <input class="input" style="vertical-align: top;" v-model="addTypeName" placeholder="请输入type名称"></input>
        </div>
    `,

    ready() {

        const request = require('request');
        const fs = require('fs');
        const path = require('path');
        const resFile = path.resolve(Editor.projectInfo.path, './assets/lib/event-manager.js');
        const dtsFile = path.resolve(Editor.projectInfo.path, './typings/event-manager.d.ts');
        const templateFile = path.resolve(Editor.projectInfo.path, './packages/event-manager/template.js');
        const templateTxt = fs.readFileSync(templateFile, 'utf-8').toString();

        new window.Vue({
            el: this.shadowRoot,
            data: {
                eventMap: {},
                typeActive: '',
                addTypeName: ''
            },
            created() {

                this.init();
            },
            methods: {
                checkAllUpdate() {
                    request('http://www.google.com', function (error, response, body) {
                        console.log('error:', error); // Print the error if one occurred
                        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                        console.log('body:', body); // Print the HTML for the Google homepage.
                    });
                },



                init() {
                    if (fs.existsSync(resFile)) {
                        this.eventMap = require(resFile);
                        for (let v in this.eventMap) {
                            this.eventMap[v].sort((a, b) => {
                                return a.localeCompare(b);
                            });
                        }
                    }
                    this.defaultSelect();
                },
                deleteId(index) {
                    this.eventMap[this.typeActive].splice(index, 1);
                },
                addId() {
                    this.eventMap[this.typeActive].push('');
                },
                addType() {
                    if (this.addTypeName.length <= 0) {
                        console.error(this.addTypeName);
                        return;
                    }
                    for (let type in this.eventMap) {
                        if (type == this.addTypeName) {
                            alert('重复的type名');
                            return;
                        }
                    }
                    Vue.set(this.eventMap, this.addTypeName, []);
                    this.addTypeName = '';
                },
                delType() {
                    Vue.delete(this.eventMap, this.typeActive);
                    this.defaultSelect();
                },
                defaultSelect() {
                    for (let type in this.eventMap) {
                        this.typeActive = type;
                        return;
                    }
                },
                save() {
                    for (let v in this.eventMap) {
                        this.eventMap[v].sort((a, b) => {
                            return a.localeCompare(b);
                        });
                    }
                    //js文件
                    const mapStr = JSON.stringify(this.eventMap, true, 4);
                    const txt = templateTxt.replace(`'##EventMapHoldPlace##'`, mapStr);
                    fs.writeFileSync(resFile, txt);
                    //d.ts文件
                    let dts = 'declare module cs.Evt {\n';
                    for (let type in this.eventMap) {
                        dts += this.getTypeDTS(type);
                    }
                    dts += '}\n';
                    fs.writeFileSync(dtsFile, dts);
                    alert('成功');
                },
                getTypeDTS(type) {
                    let dts = `\texport var ${type}: {\n\t\t`;
                    const didArr = []
                    for (let i = 0; i < this.eventMap[type].length; i++) {
                        didArr.push(this.eventMap[type][i]);
                    }
                    dts += didArr.join(': string,\n\t\t');
                    dts += ': string\n\t};\n';
                    return dts;
                }
            }
        });
    },
});