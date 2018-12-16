// Learn cc.Class:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/life-cycle-callbacks.html

cc.Class({
    extends: cc.Component,

    properties: {
        itemTemplate: cc.Prefab,
        spacing: 10,  //item之间的间隔
        rowCount: 5, // view中能显示多少行
        colCount: 2, //每行有多少个item
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        this.cacheRow = this.rowCount + 8 //缓存多少行
        this.rowCount = Math.ceil(this.rowCount)
        this.items = [] // 存储实际创建的项数组

        const item = cc.instantiate(this.itemTemplate)
        this.itemHeight = item.height
        this.itemWidth = item.width
        this.spawnCount = this.cacheRow * this.colCount
        this.bufferZone = this.cacheRow * (this.itemHeight + this.spacing) / 2

        this.scrollView = this.node.getComponent(cc.ScrollView)
        this.content = this.scrollView.content
        this.content.on("position-changed", this._updateContentView.bind(this));
    },
    resetData (data, callBack) {
        this.isInit = false
        this.canUpdateFrame = true
        this.isInit = this.initialize(data, callBack)
    },
    // 列表初始化
    initialize (data, callBack) {
        if (!callBack || !data || data.length === 0 || !this.itemTemplate || !this.scrollView) {
            console.log('初始化失败，请检查所有必要参数')
            return false
        }
        this.data = data
        this.itemUpdateFunc = callBack
        this.totalRow = Math.ceil(data.length / this.colCount) 
        this.lastContentPosY = 0 

        this.content.removeAllChildren()
        //layout组件会使item的位置无法正确更新，先移除
        if (this.content.getComponent(cc.Layout)) {
            this.content.removeComponent(cc.Layout)
        }
        // 获取整个content的高度和宽度
        this.content.height = this.totalRow * (this.itemHeight + this.spacing) + this.spacing
        this.content.width = this.colCount * (this.itemWidth + this.spacing) + this.spacing
        let row = 0
        // 创建item实例
        for (let i = 0; i < this.spawnCount; i += this.colCount) {  //遍历行
            const itemY = -this.itemHeight * (0.5 + row) - this.spacing * (row + 1)
            for (let j = 0; j < this.colCount; j++) {  //遍历列
                const itemId = i + j
                let item = null
                //items有就直接拿，否则创建新的放进去
                if (itemId >= this.items.length) {
                    item = cc.instantiate(this.itemTemplate)
                    this.items.push(item)
                } else {
                    item = this.items[itemId]
                }
                
                this.content.addChild(item)
                // 设置该item的坐标和itemId, itemId是指item显示的第几个数据
                //（注意父节点content的Anchor坐标是(0.5, 1)，所以item的y坐标总是负值）
                const itemX = (j + 0.5) * this.itemWidth + this.spacing * (j + 1) - this.content.width / 2
                item.setPosition(itemX, itemY)
                item.itemId = itemId
               
                // 当前列有数据显示，没有就隐藏
                if (itemId >= this.data.length) {
                    item.active = false
                } else {
                    item.active = true
                    this.itemUpdateFunc(itemId, item, this.data[itemId])
                }
            }
            row++
        }
        return true
    },
    // 返回item在ScrollView空间的坐标值
    getPositionInView (item) {
        const worldPos = item.parent.convertToWorldSpaceAR(item.position)
        const viewPos = this.scrollView.node.convertToNodeSpaceAR(worldPos)
        return viewPos
    },

    // content位置改变时调用，根据滚动位置动态更新item的坐标和显示(所以spawnCount可以比totalCount少很多)
    _updateContentView () {        
        if (!this.isInit || !this.canUpdateFrame) {
            return // we don't need to do the math every frame
        }
        this.canUpdateFrame = false

        const items = this.items
        const isDown = this.scrollView.content.y < this.lastContentPosY
        // 缓冲区高度，item总是上移或下移一个缓冲区高度
        const offset = (this.itemHeight + this.spacing) * this.cacheRow
        let newY = 0

        for (let i = 0; i < items.length; i += this.colCount) {
            const viewPos = this.getPositionInView(items[i])
            if (isDown) {
                newY = items[i].y + offset
                if (viewPos.y < -this.bufferZone && newY < 0) {
                    for (let j = 0; j < this.colCount; j++) {
                        const index = j + i
                        items[index].y = newY
                        const itemId = items[index].itemId - this.spawnCount// update item id
                        items[index].itemId = itemId
                        if (itemId >= 0) {
                            items[index].active = true
                            this.itemUpdateFunc(itemId, items[index], this.data[itemId])
                        } else {
                            items[index].active = false
                        }
                    }
                }
            } else {
                newY = items[i].y - offset
                if (viewPos.y > this.bufferZone && newY > -this.content.height) {
                    for (let j = 0; j < this.colCount; j++) {
                        const index = j + i
                        items[index].y = newY
                        const itemId = items[index].itemId + this.spawnCount// update item id
                        items[index].itemId = itemId
                        if (itemId < this.data.length) {
                            items[index].active = true
                            this.itemUpdateFunc(itemId, items[index], this.data[itemId])
                        } else {
                            items[index].active = false
                        }
                    }
                }
            }
        }

        // 更新lastContentPosY和总项数显示
        this.lastContentPosY = this.scrollView.content.y
        this.canUpdateFrame = true
    },
})
