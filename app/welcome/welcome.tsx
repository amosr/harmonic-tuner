export function Welcome() {
  return (
    <section className="section">
    <div className="container">
      <h1 className="title">Bulma</h1>
      <p className="subtitle">Modern css etc etc</p>
      <div className="field">
        <div className="control">
          <input className="input" type="text" placeholder="Input" />
        </div>
      </div>
      <div className="field">
        <p className="control">
          <span className="select">
            <select>
              <option>Select dropdown</option>
            </select>
          </span>
        </p>
      </div>
      <div className="buttons">
        <a className="button is-primary">Primary</a>
        <a className="button is-link">Link</a>
      </div>

<i className="fa-solid fa-user"></i>

<i className="fa-brands fa-github-square"></i>

<i className="fa-solid fa-dog"></i>
<i className="fa-solid fa-bell"></i>
<i className="fa-2x fa-solid fa-shake fa-bell"></i>

    </div>
  </section>
  );
}

// const audioCtx = new AudioContext();
// audioCtx.getOutputTimestamp