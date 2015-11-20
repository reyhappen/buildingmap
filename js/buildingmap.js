/*var mapOptsDescription = {
	viewPort: {
		dom: document.getElementById('J_mapviewport') || 'J_mapviewport',  //dom节点或者id字符串
		width: 600, //可视区域宽度，默认600
		height: 450 //可视区域高度，默认450
	},
	mapArea: {
		bgUrl: 'mapbg.jpg', //背景图（建筑图）地址url
		width: 600, //建筑图全区域宽度，默认背景图宽
		height: 450 //建筑图全区域高度，默认背景图高
	},
	editable: true||false||1||0, //是否可编辑
	points: [{id: 'DBid0', text: '图点0', left: 0, top: 0},{id: 'DBid1', text: '图点1', left: 10, top: 10}], //楼栋标识点数组
	howTocreatePoint: [function(){return 'mapHTML';}, function(){return 'pointhtml';}], //如何创建图与点
	events:{
		oncreatepoint: function(point){ }, //创建点的回调
		onaddpoint: function(point){ }, //添加单个点的回调
		onaddpoints: function(point){ }, //添加多(单)个点的回调
		onremovepoints: function(point){ }, //移除点的回调
		ondrag: function(target, left, top){ }, //拖动建筑图的回调
		onpointdrag: function(target, left, top){ } //拖动点的回调
	}
}*/
(function(win){
	var doc = win.document;
	var dragMap = function(viewPort, mapArea, points, editable, howTocreate, events){
		return new dragMap.prototype.init(viewPort, mapArea, points, editable, howTocreate, events);
	}
	
	dragMap.prototype = {
		constructor: dragMap,
		init: function(viewPort, mapArea, points, editable, howTocreate, events){
			if(!isArray(points)){
				throw new Error('points参数必须是数组！');
			}
			var me = this, viewPortDom = viewPort['dom'],
				mapBgUrl = mapArea['bgUrl'] || '';
			//获取视口节点
			if(Object.prototype.toString.call(viewPortDom) == '[object String]'){
				viewPortDom = doc.getElementById(viewPortDom);
			}
			if(!viewPortDom){
				throw new Error('未找到视口元素！');
			}
			
			//参数与节点存在与否判断
			if(viewPortDom && viewPortDom['nodeType'] == 1){
				me.pointsCount = 0;
				//me.viewport = viewPortDom; //获取的视口dom节点
				events = events || { };
				me.originalPoints = points.concat([]);
				me.added = [];
				me.edited = [];
				me.deleted = [];
				viewPort['dom'] = viewPortDom;
				me.options = {
					originalStyle: viewPortDom.style.cssText,
					originalHTML: viewPortDom.innerHTML,
					viewPort: viewPort, //传入的视口参数
					mapArea: mapArea,
					points: points,
					howTocreate: howTocreate,
					events: {
						oncreatepoint: events['oncreatepoint'] || function(point){ },
						onaddpoint: events['onaddpoint'] || function(point){ },
						onaddpoints: events['onaddpoints'] || function(points){ },
						onremovepoint: events['onremovepoint'] || function(point){ },
						ondrag: events['ondrag'] || function(target, left, top){ },
						onpointdrag: events['onpointdrag'] || function(target, left, top){ },
						onpointclick: events['onpointclick'] || function(target, left, top){ },
						onpointenter: events['onpointenter'] || function(target){
							target.style.zIndex = 10;
						},
						onpointleave: events['onpointleave'] || function(target){
							target.style.zIndex = 0;
						}
					}
				};
				//判断视口节点是否已定位
				var viewPortPos = css(viewPortDom, 'position');
				if(viewPortPos == 'static' || !viewPortPos){
					css(viewPortDom, 'position', 'relative');
				}
				css(viewPortDom, 'overflow', 'hidden'); //预先设置避免IE6最小高度bug
				
				//视口宽高获取与赋值
				var viewWidth = viewPort['width'] || viewPortDom.clientWidth || 600,
					viewHeight = viewPort['height'] || viewPortDom.clientHeight || 450;
				//设置视口宽高
				css(viewPortDom, 'width', viewWidth+'px');
				css(viewPortDom, 'height', viewHeight+'px');
				me.options.viewPort['width'] = viewWidth;
				me.options.viewPort['height'] = viewHeight;
				
				//默认显示加载中...
				viewPortDom.innerHTML = '<div style="text-align:center;line-height:'+ viewHeight +'px">建筑图加载中...</div>';
				var mapHTML = '', createMap;
				if(!howTocreate || howTocreate.length < 2){
					createMap = me.createMap;
					if(howTocreate && howTocreate.length > 0 && console){
						console.error('howTocreate参数为数组必须提供两个方法，且第一个为创建建筑图HTML的方法，第二个为创建某个点HTML的方法以保证HTML结构正确性！');
					}
				}else{
					createMap = howTocreate[0] || me.createMap;
				}
				
				//若事先提供了建筑图（背景图片）尺寸则可直接生成，未提供时则需要在图片加载完成后获取到宽高生成
				if(mapArea['width'] && mapArea['height']){
					renderNbindEvents(me, editable, createMap, mapArea['width'], mapArea['height'], mapBgUrl);
				}else{
					if(mapBgUrl != ''){
						this.changeMap(mapBgUrl, 1, function(successful){
							//successful表示背景图片加载成功还是失败
							renderNbindEvents(me, editable, createMap, mapArea['width'], mapArea['height'], mapBgUrl);
						});
					}else{
						mapArea['width'] = viewWidth;
						mapArea['height'] = viewHeight;
						renderNbindEvents(me, editable, createMap, viewWidth, viewHeight, mapBgUrl);
					}
				}
			}
			return me;
		},
		timeStamp: new Date().getTime(),
		createMap: function(mapWidth, mapHeight, mapBgUrl){
			var opts = this.options, viewPort = opts.viewPort,
				i=0, points = opts.points, il=points.length,
				mapHTML = '<div role="map" class="J_buildingmap" style="position:absolute;left:'+ ((viewPort.width - mapWidth)/2) +'px;top:'+ ((viewPort.height - mapHeight)/2) +'px;width:'+ mapWidth +'px;height:'+ mapHeight +'px;background:url('+ mapBgUrl +');-webkit-user-select:none;-moz-user-select:none;user-select:none;">';
			for(; i<il; i++){
				mapHTML += this.createPoint(points[i]);
			}
			mapHTML += '</div>';
			return mapHTML;
		},
		createPoint: function(point){
			var opts = this.options, howTocreate = opts.howTocreate,
				oncreatepoint = opts.events.oncreatepoint,
				isAdded = !('id' in point), pointHTML = '';
			if(howTocreate && howTocreate[1]){
				pointHTML = howTocreate[1].call(this, point);
			}else{
				pointHTML = '<div role="point" origid="'+ point['id'] +'" index='+ this.pointsCount +' isadded="'+ (isAdded ? 1 : 0) +'" class="J_point J_point'+ (isAdded ? new Date().getTime() : point['id']) +'" style="position:absolute;left:'+ point['left'] +'px;top:'+ point['top'] +'px;z-index:0;-webkit-user-select:none;-moz-user-select:none;user-select:none;">'+ point['text'] +'<s></s><i></i></div>';
			}
			oncreatepoint.call(this, point);
			this.pointsCount++;
			//isAdded被用于判断是否是新添加的图点
			return pointHTML;
		},
		addPoint: function(point){
			var opts = this.options, points = opts.points,
				tmp = doc.createElement('div');
			if(point['text'] == ''){
				console && console.error('此'+ point +'点没有文本内容！');
			}
			points.push(point);
			this.added.push(point);
			
			point['left'] = point['left'] || 0;
			point['top'] = point['top'] || 0;
			tmp.innerHTML = this.createPoint(point);
			opts.mapArea.dom.appendChild(tmp.firstChild);
			tmp = null;
			
			//触发添加事件
			opts.events['onaddpoint'].call(this, point);
			return this;
		},
		addPoints: function(points){
			var me = this, opts = me.options, ps = [], optPoints = opts.points,
				tmp = doc.createElement('div'), tmpHTML = '',
				frag = doc.createDocumentFragment();
			if(!isArray(points)){
				ps.push(points);
			}else{
				ps = ps.concat(points);
			}
			opts.points = optPoints.concat(ps);
			for(var i=0,il=points.length; i<il; i++){
				var point = points[i];
				if(point['text'] == ''){
					console && console.error('第'+ i +'个添加点没有文本内容！');
				}
				point['left'] = point['left'] || 0;
				point['top'] = point['top'] || 0;
				tmp.innerHTML = me.createPoint(point);
				frag.appendChild(tmp.firstChild);
				me.added.push(point);
			}
			opts.mapArea.dom.appendChild(frag);
			tmp = null;
			
			//触发添加事件
			opts.events['onaddpoints'].call(this, ps);
			return this;
		},
		removePoint: function(point){
			//point可以是id可以是数组索引可以是数组下的元素（必须带有id属性）
			var me = this, opts = me.options, mapDom = opts.mapArea.dom,
				isRemoved = false, points = opts.points, pointIndex = parseInt(point);
			if(points.length){
				if(isNaN(pointIndex)){
					for(var i=0, il=points.length; i<il; i++){
						if(point['id'] && point['id'] == points[i]['id']){
							//移除dom
							mapDom.removeChild(mapDom.childNodes[i]);
							points.splice(i, 1);
							me.deleted.push(point);
							isRemoved = true;
							break;
						}
					}
				}else{
					var pointNode = mapDom.childNodes[pointIndex];
					if(!pointNode.getAttribute('isadded')){
						me.deleted.push(points[pointIndex]);
					}
					//移除dom
					mapDom.removeChild(pointNode);
					points.splice(pointIndex, 1);
					isRemoved = true;
				}
			}
			
			//触发移除事件
			opts.events['onremovepoint'].call(this, point, isRemoved);
			return this;
		},
		changeMap: function(url, ifchangeWH, callback){
			if(url === '') return this;
			//在图片加载完成之后再进行数据生成
			var me = this, opts = this.options, viewPort = opts.viewPort,
				mapArea = opts.mapArea, img = new Image();
			
			url = /\?/.test(url) ? url : url+'?';
			
			img.onerror = function(){
				//viewPort.dom.innerHTML = '<div style="color:#f00;text-align:center;line-height:'+ viewPort.height +'px">建筑图加载失败！</div>';
				if(callback){
					callback(false);
				}
				this.onerror = null;
				this.onload = null;
			};
			img.onload = function(){
				if(ifchangeWH){
					me.setMapArea(this['width'], this['height']);
				}
				
				if(callback){
					callback(true);
				}else{
					mapArea.dom.style.backgroundImage = 'url('+ url +')';
				}
			};
			img.src = url;
			return this;
		},
		setViewPort: function(width, height){
			var viewPort = this.options.viewPort;
			viewPort.width = width;
			viewPort.height = height;
			viewPort.dom.style.width = width;
			viewPort.dom.style.height = height;
			setCenter(this.options.mapArea.dom);
			return this;
		},
		setMapArea: function(width, height){
			var mapArea = this.options.mapArea;
			mapArea.width = width;
			mapArea.height = height;
			mapArea.dom.style.width = width;
			mapArea.dom.style.height = height;
			setCenter(mapArea.dom);
			return this;
		},
		clear: function(){
			var opts = this.options;
			opts.mapArea.dom.innerHTML = '';
			this.originalPoints = [];
			this.added = [];
			this.edited = [];
			this.deleted = [];
			this.pointsCount = 0;
			return this;
		},
		destroy: function(){
			var opts = this.options;
			opts.viewPort.dom.style.cssText = opts.originalStyle;
			opts.viewPort.dom.innerHTML = opts.originalHTML;
			this.originalPoints = this.pointsCount = this.options = this.added = this.edited = this.deleted = null;
			delete this.originalPoints;
			delete this.pointsCount;
			delete this.options;
		}
	}
	function isArray(obj){
		return Object.prototype.toString.call(obj) == '[object Array]';
	}
	
	//获取与设置元素样式
	function css(dom, attr, val){
		if(typeof val != 'undefined'){
			dom.style[attr] = val;
		}else{
			if(dom.currentStyle){
				return dom.currentStyle[attr];
			}else{
				return win.getComputedStyle(dom)[attr];
			}
		}
	}
    //为元素添加事件
	function addEvent(el,type,fn){
		if(el.addEventListener){
			el.addEventListener(type,fn,false);
		}else if(el.attachEvent){
			el.attachEvent('on'+type,fn)
		}else{
			el['on'+type] = fn;
		};
	};
    //为元素移除事件
	function removeEvent(el,type,fn){
		if(el.removeEventListener){
			el.removeEventListener(type,fn,false);
		}else if(el.detachEvent){
			el.detachEvent('on'+type,fn);
		}else{
			el['on'+type] = function(){};
		};
	};
	
	function setCenter(target){
		target.style.top = (target.parentNode.clientHeight - target.clientHeight)/2 + 'px';
		target.style.left = (target.parentNode.clientWidth - target.clientWidth)/2 + 'px';
	}
	
	//默认生成html并绑定事件
	function renderNbindEvents(dragmap, editable, createMap, width, height, mapBgUrl){
		var opts = dragmap.options, viewPort = opts.viewPort, viewPortDom = viewPort.dom,
			mapArea = opts.mapArea, events = opts.events, dd = doc.documentElement, db = doc.body;
		viewPortDom.innerHTML = createMap.call(dragmap, width, height, mapBgUrl);
		var map = viewPortDom.firstChild;
		mapArea.dom = map;
		//建筑图点鼠标移进
		addEvent(map, 'mouseover', function(e){
			e = e || win.event;
			var target = e.srcElement || e.target;
			if(target != map){
				if(target.innerHTML === ''){
					target = target.parentNode;
				}
				events.onpointenter.call(dragmap, target, e);
			}
		});
		//建筑图点鼠标移出
		addEvent(map, 'mouseout', function(e){
			e = e || win.event;
			var target = e.srcElement || e.target;
			if(target != map){
				if(target.innerHTML === ''){
					target = target.parentNode;
				}
				events.onpointleave.call(dragmap, target, e);
			}
		});
		//建筑图点按下鼠标
		addEvent(map, 'mousedown', function(e){
			e = e || win.event;
			var target = e.srcElement || e.target, mousePos= getMousePos(e),
				_move = move(dragmap, editable, mousePos, map, viewPortDom.clientWidth, viewPortDom.clientHeight, map.clientWidth, map.clientHeight, target, target.offsetTop, target.offsetLeft);
			upHandler.move = _move;
			addEvent(doc, 'mousemove', _move);
			addEvent(doc, 'mouseup', upHandler);
			return false;
		});
		//建筑图点单击鼠标
		addEvent(map, 'click', function(e){
			commonEvent(e, map, function(target, event){
				var dd = doc.documentElement, db = doc.body,
					bound = target.getBoundingClientRect(),
					left = Math.max(dd.scrollLeft, db.scrollLeft) + bound.left,
					top = Math.max(dd.scrollTop, db.scrollTop) + bound.top;
				events.onpointclick.call(dragmap, target, left, top, event);
			});
		});
	}
	
	//common events
	function commonEvent(e, map, callback){
		e = e || win.event;
		var target = e.srcElement || e.target;
		if(target != map){
			if(target.innerHTML === ''){
				target = target.parentNode;
			}
			callback(target, e);
		}
		return target;
	}
	
	//获取鼠标位置
	function getMousePos(e){
		e = e || win.event;
		return {
			x: e.clientX,
			y: e.clientY
		};
	};
	//元素移动方法
	function move(dragmap, editable, oldPos, map, viewWidth, viewHeight, mapWidth, mapHeight, target, t, l){
		var deltaX = oldPos.x - l, deltaY = oldPos.y - t, points = dragmap.options.points,
			pointDoms = map.childNodes, point = null;
		/*if(target != map){
			for(var i=0, il=pointDoms.length; i<il; i++){
				var pointDomi = pointDoms[i];
				if(pointDomi == target){
					point = points[i];
					if(pointDomi.getAttribute('origid') == points[i]['id'] && !pointDomi.getAttribute('isadded')){
						//point = dragmap.options.points[i];
					}
					break;
				}
			}
		}*/
		
		return function(e){
			e = e || win.event;
			var newPos = getMousePos(e),
				left = newPos.x - deltaX,
				top = newPos.y - deltaY;
			//clear selection
			if(doc.selection && doc.selection.empty) {
				doc.selection.empty();  //IE
			}else if(win.getSelection) {
				win.getSelection().removeAllRanges(); //DOM
			};
			if(target.innerHTML === ''){
				return;
				target = target.parentNode;
			}
			//当拖动对象不是建筑图时
			if(target != map){
				//如果不可编辑或者内部为空(可能是修饰样式的元素)时不需要任何操作
				if(!editable || target.innerHTML === '') return false;
				
				//不超出建筑图区，图点只限制内部运动
				if(left <= 0){
					left = 0; //左边不小于0
				}else if(left > mapWidth - target.offsetWidth){
					left = mapWidth - target.offsetWidth; //右边不大于建筑图宽-图点宽
				}
				if(top <= 0){
					top = 0; //上边不小于0
				}else if(top > mapHeight - target.offsetHeight){
					top = mapHeight - target.offsetHeight; //下边不大于建筑图高-图点高
				}
			}else{
				if(viewWidth >= mapWidth){
					//与图点原理一致
					if(left <= 0){
						left = 0;
					}else if(left > viewWidth - mapWidth){
						left = viewWidth - mapWidth;
					}
				}else{
					//当显示区小于建筑图区时
					if(left >= 0){
						left = 0; //左侧必须小于等于0
					}else if(Math.abs(left) > mapWidth - viewWidth){
						left = viewWidth - mapWidth; //右侧不超出必须使left在负的建筑区宽-视口区宽
					}
				}
				if(viewHeight >= mapHeight){
					//与图点原理一致
					if(top <= 0){
						top = 0;
					}else if(top > viewHeight - mapHeight){
						top = viewHeight - mapHeight;
					}
				}else{
					//当显示区小于建筑图区时
					if(top >= 0){
						top = 0; //上侧必须小于等于0
					}else if(Math.abs(top) > mapHeight - viewHeight){
						top = viewHeight - mapHeight; //下侧不超出必须使top在负的建筑区高-视口区高
					}
				}
			}
            
			target.style.left = left+'px';
			target.style.top = top+'px';
			if(target != map){
				dragmap.options.events['onpointdrag'].call(dragmap, target, left, top);
				/*point.left = left;
				point.top = top;*/
			}else{
				dragmap.options.events['ondrag'].call(dragmap, target, left, top);
			}
		};
	};
	
	//鼠标抬起，移除绑定的移动和自身鼠标抬起的事件
	function upHandler(e){
		removeEvent(doc, 'mousemove', upHandler.move);
		removeEvent(doc, 'mouseup', upHandler);
	}
	
	dragMap.prototype.init.prototype = dragMap.prototype;
	
	window.dragMap = dragMap;
})(window);