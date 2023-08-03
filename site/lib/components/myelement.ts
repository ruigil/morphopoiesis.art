import {LitElement, html} from 'npm:lit';
import {customElement, property} from 'npm:lit/decorators.js';

@customElement('my-element')
export class MyElement extends LitElement {
  @property()
  version = 'STARTING';

  render() {
    return html`
    <p>Welcome to the Lit tutorial!</p>
    <p>This is the ${this.version} code.</p>
    `;
  }
}