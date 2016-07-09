import React from 'react';
import Universe from './physics';
import Raphael from 'raphael';
import _ from 'lodash';
import {RadioGroup, Radio} from 'react-radio-group';

export default class Canvas extends React.Component {
    constructor() {
        super();
        this.state = {
            mode: 'add-mass'
        };
        this.universe = new Universe();
        _.bindAll(this, ['handleMode', 'handleClick']);
    }

    handleMode(value) {
        this.setState({ mode: value });
    }
    
    render() {
        return (
            <div>
                <div id="paper" />
                <RadioGroup name="mode"
                            selectedValue={ this.state.mode }
                            onChange={ this.handleMode }>
                    <label>
                        <Radio value="add-mass" />Add masses
                    </label>
                    <label>
                        <Radio value="add-spring" />Add springs
                    </label>
                    <label>
                        <Radio value="drag-mass" />Drag masses
                    </label>
                    <label>
                        <Radio value="animate" />Animate
                    </label>
                </RadioGroup>
            </div>
        );
    }

    componentDidMount() {
        this.setupCanvas();
    }

    // From physical coordinates to paper coordinates
    X(x) {
       return x+Math.floor(this.paper.width/2); 
    }

    Y(y) {
        return Math.floor(this.paper.height/2)-y; 
    }

    // From paper coordinates to physical coordinates
    x(X) {
        return X-Math.floor(this.paper.width/2); 
    }

    y(Y) {
        return Math.floor(this.paper.height/2)-Y;
    }

    handleClick(e) {
        if (this.state.mode == 'add-mass') {
            this.addMass(e.x, e.y);
        }
    }

    handleDragStart(X, Y, mass) {
        if (this.state.mode == 'add-spring') {
            mass.el.attr({ fill: 'lime' });
        }
    }

    handleDragMove(dX, dY, mass) {
        if (this.state.mode == 'add-spring') {
            if (! this._dragLine) {                
                this._dragLine = this.paper.path();
            }
            const XO = this.X(mass.position[0]);
            const YO = this.Y(mass.position[1]);
            const Xt = XO + dX;
            const Yt = YO + dY;

            if (this._dragEndElement)
                this._dragEndElement.attr({
                    fill: this._dragEndElement.data('originalFill')
                });

            const el = this.paper.getElementByPoint(Xt, Yt);
            if (el != null && el.data('type') == 'mass' && el.parent !== mass) {
                this._dragEndElement = el;
                this._dragEndElement.attr({ fill: 'lime'});
            }
            
            const path = `M${XO},${YO} L${Xt},${Yt}`;
            this._dragLine.attr({ path, stroke: 'lime' });
        } else if (this.state.mode == 'drag-mass') {
            console.log(mass);
            
            if (mass.anchored)
                return;
            
            mass.el.attr({
                cx: this.X(mass.position[0]) + dX,
                cy: this.Y(mass.position[1]) + dY
            });

            for (let spring of this.universe.springs) {
                if (spring.from === mass || spring.to === mass) {
                    
                }
            }
        }
    }

    handleDragEnd(X, Y, mass) {
        if (this.state.mode == 'add-spring') {
            this._dragLine.remove();
            this._dragLine = null;

            mass.el.attr({ fill: mass.el.data('originalFill') });
            if (this._dragEndElement)
                this._dragEndElement.attr({
                    fill: this._dragEndElement.data('originalFill')
                });

            const el = this.paper.getElementByPoint(X, Y);
            if (el != null && el.data('type') == 'mass' && el.parent !== mass) {
                this.addSpring(el.parent, mass);
            }
        }
    }

    addSpring(mass1, mass2) {
        let spring = this.universe.addSpring(mass1, mass2);
        const X1 = this.X(mass1.position[0]);
        const Y1 = this.Y(mass1.position[1]);
        const X2 = this.X(mass2.position[0]);
        const Y2 = this.Y(mass2.position[1]);
        
        spring.el = this.paper
                        .path(`M${X1},${Y1} L${X2},${Y2}`)
                        .attr({ stroke: 'yellow' });
        spring.el.parent = spring;
    }
    
    addMass(X, Y, anchored=false) {
        let mass = this.universe.addMass(this.x(X),
                                         this.y(Y),
                                         anchored);
        mass.el = this.paper
                      .circle(X, Y, 20)
                      .attr({ fill: (anchored ? 'white' : 'yellow') })
                      .data({
                          originalFill: (anchored ? 'white' : 'yellow'),
                          type: 'mass'
                      });
        
        mass.el.parent = mass;
        mass.el.drag((dX, dY, X, Y) => { this.handleDragMove(dX, dY, mass) },
                     (X, Y) => { this.handleDragStart(X, Y, mass) },
                     (e) => { this.handleDragEnd(e.x, e.y, mass) });

        return mass;
    }
    
    // Set up canvas
    setupCanvas() {
        this.paper = new Raphael(document.getElementById("paper"),
                                 500,
                                 500);

        this.bg = this.paper.rect(0, 0, 500, 500);
        this.bg.attr({fill: 'black' });
        this.bg.touchend((e) => this.handleClick(e));
        this.bg.mouseup((e) => this.handleClick(e));

        this.addMass(this.X(0), this.Y(0), true);
    }
}

