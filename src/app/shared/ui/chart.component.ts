import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
    selector: 'app-chart',
    standalone: true,
    template: `
    <div class="relative w-full h-full">
      <canvas #canvas></canvas>
    </div>
  `
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    @Input() type: ChartType = 'bar';
    @Input() data: any = {};
    @Input() options: any = {};

    private chart: Chart | null = null;

    constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

    ngAfterViewInit() {
        this.renderChart();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.chart) {
            this.chart.destroy();
            this.renderChart();
        }
    }

    ngOnDestroy() {
        if (this.chart) this.chart.destroy();
    }

    private renderChart() {
        if (!isPlatformBrowser(this.platformId)) return;

        // Default Styling
        Chart.defaults.color = '#64748b';
        Chart.defaults.font.family = 'Inter, sans-serif';

        const ctx = this.canvasRef.nativeElement.getContext('2d');
        if (!ctx) return;

        const config: ChartConfiguration = {
            type: this.type,
            data: this.data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                ...this.options
            }
        };

        this.chart = new Chart(ctx, config);
    }
}
