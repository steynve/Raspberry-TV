import { IconName } from './icon-name.type';
import { Component, computed, input } from '@angular/core';

@Component({
    selector: 'app-icon',
    template: '',
    styleUrl: './icon.component.scss',
    host: {
        'aria-hidden': 'true',
        '[style.--icon]': 'url()',
    },
})
export class IconComponent {
    public readonly name = input.required<IconName>();

    protected readonly url = computed(() => `url('/assets/icons/${this.name()}.svg')`);
}
