import React from 'react';
import Universe from './physics';
import Raphael from 'raphael';
import _ from 'lodash';
import {RadioGroup, Radio} from 'react-radio-group';
import $ from 'jquery';

const MASS_RADIUS = 15;

export default class Canvas extends React.Component {
    constructor() {
        super();
        this.state = {
            mode: 'add-mass',
            friction: 0.,
            gravity: false,
            energy: { E: 0, K: 0, U: 0},
            zoom: 1,
            speed: 4
        };
        this.universe = new Universe();
        _.bindAll(this, ['handleMode', 'handleClick', 'handleFriction', 'handleGravity', 'animate', 'sync']);
    }

    handleMode(mode) {
        this.setState({ mode });

        if (mode === "animate") {
            this.zeroVelocity();
            _.defer(this.animate);
        }
    }

    handleFriction(e) {
        const friction = e.target.value;

        this.setState({ friction });
        this.universe.friction = +friction;
    }

    handleGravity(e) {
        const gravity = e.target.checked;
        this.setState({ gravity });
        this.universe.gravity = (gravity ? 50 : 0);
    }

    handleZoom(zoom) {
        this.setState({ zoom });
        _.defer(this.sync);
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
                        <Radio value="add-spring" />Connect w/ springs (drag from one mass to another)
                    </label>
                    <label>
                        <Radio value="drag-mass" />Drag masses
                    </label>
                    <label>
                        <Radio value="animate" />Animate
                    </label>
                </RadioGroup>
                <div>
                    Friction:
                    <input type="text" value={ this.state.friction } onChange={ this.handleFriction }/>
                    Gravity:
                    <input type="checkbox" value={ this.state.gravity} onChange={ this.handleGravity }/>
                <button onClick={ (e) => this.handleZoom(this.state.zoom * 1.5) }>Zoom in</button>
                <button onClick={ (e) => this.handleZoom(this.state.zoom / 1.5) }>Zoom out</button>
                <button onClick={ (e) => this.handleZoom(1) }>Original zoom</button>
                <button onClick={ (e) => this.clear() }>Clear</button>
                <button onClick={ (e) => this.randomize() }>Bungee</button>
                </div>
                <div>
                    E:
                    <span>{ this.state.energy.E.toFixed(2) }</span>
                </div>
                <div>
                    K:
                    <span>{ this.state.energy.K.toFixed(2) }</span>
                </div>
                <div>
                    U:
                    <span>{ this.state.energy.U.toFixed(2) }</span>                    
                </div>
            </div>
        );
    }

    componentDidMount() {
        this.setupCanvas();
    }

    // From physical coordinates to paper coordinates
    X(x) {
       return x * this.state.zoom+Math.floor(this.paper.width/2); 
    }

    Y(y) {
        return Math.floor(this.paper.height/2)-y * this.state.zoom; 
    }

    // From paper coordinates to physical coordinates
    x(X) {
        return (X-Math.floor(this.paper.width/2)) / this.state.zoom; 
    }

    y(Y) {
        return (Math.floor(this.paper.height/2)-Y)/this.state.zoom;
    }

    handleClick(e, mass) {
        if (this.state.mode == 'add-mass') {
            if (mass !== undefined) {
                this.removeMass(mass);
            } else {
                this.addMass(e.x, e.y);
            }
        }
    }

    handleDragStart(X, Y, mass) {
        if (this.state.mode == 'add-spring') {
            mass.el.attr({ fill: 'lime' });
        } else if (this.state.mode == 'drag-mass') {
            mass._dragOrigin = [mass.position[0],
                                mass.position[1]];
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
            this._dragLine.attr({ path, stroke: 'lime', ['stroke-width']: 3 });
        } else if (this.state.mode == 'drag-mass') {
            if (mass.anchored)
                return;

            mass.position[0] = mass._dragOrigin[0] + dX;
            mass.position[1] = mass._dragOrigin[1] - dY;
            
            this.sync();
        }
    }

    handleDragEnd(X, Y, mass) {
        if (this.state.mode == 'add-spring') {
            if (this._dragLine)
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

            this.sync();
        }
    }

    clear() {
        for (let mass of this.universe.masses)
            mass.el.remove();
        for (let spring of this.universe.springs)
            spring.el.remove();
        this.universe.masses = [];
        this.universe.springs = [];
        
        this.addMass(this.X(0), this.Y(0), true);
    }

    addSpring(mass1, mass2) {
        let spring = this.universe.addSpring(mass1, mass2);
        const X1 = this.X(mass1.position[0]);
        const Y1 = this.Y(mass1.position[1]);
        const X2 = this.X(mass2.position[0]);
        const Y2 = this.Y(mass2.position[1]);
        
        spring.el = this.paper
                        .path(`M${X1},${Y1} L${X2},${Y2}`)
                        .attr({ stroke: 'yellow', ['stroke-width']: 3 });
        spring.el.parent = spring;
    }
    
    addMass(X, Y, anchored=false) {
        let mass = this.universe.addMass(this.x(X),
                                         this.y(Y),
                                         anchored);
        mass.el = this.paper
                      .circle(X, Y, MASS_RADIUS)
                      .attr({ fill: (anchored ? 'white' : 'yellow') })
                      .data({
                          originalFill: (anchored ? 'white' : 'yellow'),
                          type: 'mass'
                      });
        
        mass.el.parent = mass;
        mass.el.drag((dX, dY, X, Y) => { this.handleDragMove(dX, dY, mass) },
                     (X, Y) => { this.handleDragStart(X, Y, mass) },
                     (e) => { this.handleDragEnd(e.x, e.y, mass) });

        mass.el.click((e) => this.handleClick(e, mass));
        return mass;
    }

    removeMass(mass) {
        this.universe.removeMass(mass);
        mass.el.remove();
        for (let spring of this.universe.springs)
            if (spring.from === mass || spring.to === mass)
               spring.el.remove();
    }
    
    // Set up canvas
    setupCanvas() {
        this.paper = new Raphael(document.getElementById("paper"),
                                 640,
                                 640);

        this.bg = this.paper.rect(0, 0, 640, 640);
        this.bg.attr({fill: 'black' });
        this.bg.touchend((e) => this.handleClick(e));
        this.bg.mouseup((e) => this.handleClick(e));
        document.getElementById("paper").onmousemove = function(e) {
            $("#text").text(e.clientX + " " + e.clientY);
        }

        this.addMass(this.X(0), this.Y(0), true);
    }

    sync() {
        for (let mass of this.universe.masses) {
            mass.el.attr({
                cx: this.X(mass.position[0]),
                cy: this.Y(mass.position[1]),
                r: MASS_RADIUS * this.state.zoom
            });
            mass.el.toFront();
            
        }

        for (let spring of this.universe.springs) {
            const path = `M${this.X(spring.from.position[0])},${this.Y(spring.from.position[1])} ` +
                         `L${this.X(spring.to.position[0])},${this.Y(spring.to.position[1])}`;
            spring.el.attr({ path });
            spring.el.toBack();
        }

        this.bg.toBack();
        this.setState({ energy: this.universe.energy() });
    }

    zeroVelocity() {
        for (let mass of this.universe.masses) {
            mass.velocity[0] = mass.velocity[1] = 0;
        }
    }

    randomize() {
        const a = this.paper.width/30;
        for (let i = 0; i < 20; i++) {
            const theta = (i+1) * Math.PI/5;
            const r = a * theta;
            console.log(theta, r);
            let X = Math.cos(theta) * r + this.paper.width/2;
            let Y = Math.sin(theta) * r + this.paper.height/2;
            
            this.addMass(X, Y);
        }

        const N = this.universe.masses.length;
        for (let i = 0; i < N-1; i++) {            
            this.addSpring(this.universe.masses[i], this.universe.masses[i+1]);
        }
    }
    
    animate() {
        if (this.state.mode !== "animate")
            return;

        for (let i = 0; i < this.state.speed; i++)
            this.universe.evolve();
        
        this.sync();
        requestAnimationFrame(this.animate);
    }
}
