import clamp from 'lodash/clamp';
import DT from 'duration-time-conversion';

export default class Sub {
    constructor(obj) {
        this.start = obj.start;
        this.end = obj.end;
        if (typeof obj.startTime === 'number' && !this.start) {
            this.start = DT.d2t(clamp(obj.startTime, 0, Infinity));
        }
        if (typeof obj.endTime === 'number' && !this.end) {
            this.end = DT.d2t(clamp(obj.endTime, 0, Infinity));
        }
        this.text = obj.text;
        this.text2 = obj.text2;
        this.style = obj.style || {};
    }

    get check() {
        return this.startTime >= 0 && this.endTime >= 0 && this.startTime < this.endTime;
    }

    get clone() {
        return new Sub(this);
    }

    get startTime() {
        if (typeof this.start === 'string') {
            const time = DT.t2d(this.start.replace(',', '.'));
            return Number.isFinite(time) ? time : 0;
        }
        const time = DT.t2d(this.start);
        return Number.isFinite(time) ? time : 0;
    }

    set startTime(time) {
        this.start = DT.d2t(clamp(time, 0, Infinity));
    }

    get endTime() {
        if (typeof this.end === 'string') {
            const time = DT.t2d(this.end.replace(',', '.'));
            return Number.isFinite(time) ? time : 0;
        }
        const time = DT.t2d(this.end);
        return Number.isFinite(time) ? time : 0;
    }

    set endTime(time) {
        this.end = DT.d2t(clamp(time, 0, Infinity));
    }

    get duration() {
        return parseFloat((this.endTime - this.startTime).toFixed(3));
    }
}
